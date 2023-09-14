const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');
const crypto = require('crypto');
const { first, find, filter, omit, isEmpty, map } = require('lodash');
const {
  mposDeviceError,
  mposDeviceStatus,
  orderSetStatusNames,
  brandLocationStatus,
  orderPaymentMethods,
  menuItemUnavailableState,
  mposOrderSubscriptionEvent,
  paymentStatusOrderType,
  transactionAction,
  transactionType,
  customerAnalyticsEvents,
  streams,
  streamActions,
  orderTypes,
} = require('../root/enums');
const sqs = require('./../../lib/sqs-base')('mpos');
const { publishVerifiedEmailToBraze } = require('../../lib/braze');
const { sendCustomerEvent } = require('../../lib/customer-analytics');
const { addLocalizationField, publishMposSubscriptionEvent, mapPaymentMethod } = require('../../lib/util');
const moment = require('moment');
const SlackWebHookManager = require('../slack-webhook-manager/slack-webhook-manager');
const { env } = require('../../../config');
const isUUID = require('is-uuid');
const { notificationsForStatusChange } = require('../order-set-status/notifications');
const mposWebhookUrl = require('../../../config').mpos.slackWebHook;
const {
  transformToCamelCase
} = require('../../lib/util');
// const admin = require('firebase-admin');
const {
  getCachedArrivedOrder,
  saveCachedArrivedOrder,
  calculateArrivedOrderKey,
} = require('./redis-helper');
const IGNORE_ARRIVED_STATUS = [
  orderSetStatusNames.INITIATED,
  orderSetStatusNames.PLACED,
  orderSetStatusNames.PAYMENT_CANCELED,
  orderSetStatusNames.PAYMENT_FAILURE,
  orderSetStatusNames.COMPLETED
];
const { brandLocationStoreStatus } = require('../brand-location/enums');
const { publishEvent } = require('../../lib/event-publisher');
const { EventType } = require('../../lib/event-publisher/enums');
const { menuItemStatus } = require('../menu-item/enums');

class BrandLocationDevice extends BaseModel {
  constructor(db, context) {
    super(db, 'brand_location_devices', context);
    this.loaders = createLoaders(this);
  }

  async getDeviceByDeviceId(deviceId) {
    return await this.roDb(this.tableName)
      .select('*')
      .where('device_id', deviceId)
      .andWhere('status', mposDeviceStatus.PAIRED)
      .then(first);
  }

  async generateCodeByDeviceId({ deviceId }) {
    /* React native device library may generate the different length device id
      if (deviceId.length !== 16) {
        SlackWebHookManager.sendTextToSlack(`MPOS /code Invalid request for deviceId: ${deviceId}`);
        return { success: false, message: 'Invalid deviceId' };
      }
    */

    if (
      (await this.roDb(this.tableName)
        .count('id')
        .where('device_id', deviceId)
        .andWhere('status', mposDeviceStatus.PAIRED))[0].count > 0
    ) {
      SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/code] The device (${deviceId}) is already paired, switch to order page.`, mposWebhookUrl);
      return { success: false, message: 'Device already paired' };
    }

    const device = await this.roDb(this.tableName)
      .select('*')
      .where('device_id', deviceId)
      .andWhere('status', mposDeviceStatus.INIT);

    if (device.length > 0) {
      return { success: true, code: device[0].code };
    }
    let code = '';
    let isExist = true;

    while (isExist) {
      code = crypto
        .randomBytes(20)
        .toString('hex')
        .substring(0, 5);

      isExist =
        // eslint-disable-next-line no-await-in-loop
        (await this.db(this.tableName)
          .count('id')
          .where('code', code))[0].count > 0;
    }
    await this.save({
      deviceId,
      code,
      status: mposDeviceStatus.INIT,
    });
    return { success: true, code };
  }

  async isValidDevice(deviceId) {
    return await this.roDb(this.tableName)
      .select('*')
      .where('device_id', deviceId)
      .andWhere('status', mposDeviceStatus.PAIRED)
      .then(first);
  }

  async getDeviceByBrandLocationId(brandLocationId) {
    return await this.roDb(this.tableName)
      .select('*')
      .where('brand_location_id', brandLocationId)
      .andWhere('status', mposDeviceStatus.PAIRED)
      .then(first);
  }

  async isValidDeviceCode({ code, brandLocationId }) {
    const errors = [];
    if (code.length !== 5) errors.push(mposDeviceError.INVALID_DEVICE_CODE);

    const devices = await this.roDb(this.tableName)
      .select('*')
      .where('code', code);
    if (devices.length === 0) errors.push(mposDeviceError.INVALID_DEVICE);

    const availableDevice = devices.filter(
      device => device.status === mposDeviceStatus.INIT
    );
    if (availableDevice.length === 0)
      errors.push(mposDeviceError.DEVICE_ALREADY_PAIRED);

    const brandLocation = await this.context.brandLocation.getById(
      brandLocationId
    );
    if (
      !brandLocation ||
      (brandLocation && brandLocation.status === brandLocationStatus.DELETED)
    ) {
      errors.push(mposDeviceError.INVALID_BRAND_LOCATION);
    }

    return errors;
  }

  async isValidDeviceForUnpairing({ deviceId, brandLocationId }) {
    const errors = [];
    const device = await this.roDb(this.tableName)
      .select('*')
      .where('device_id', deviceId)
      .andWhere('brand_location_id', brandLocationId)
      .andWhere('status', mposDeviceStatus.PAIRED)
      .then(first);

    if (!device) {
      errors.push(mposDeviceError.INVALID_DEVICE);
    }
    return errors;
  }

  async pairDeviceWithBrandLocation({ code, brandLocationId }) {
    const device = await this.roDb(this.tableName)
      .select('*')
      .where('code', code)
      .andWhere('status', mposDeviceStatus.INIT)
      .then(first);
    device.brandLocationId = brandLocationId;
    device.status = mposDeviceStatus.PAIRED;
    await this.save(device);
    return device;
  }

  async unpairDeviceWithBrandLocation({ deviceId, brandLocationId }) {
    const device = await this.roDb(this.tableName)
      .select('*')
      .where('device_id', deviceId)
      .andWhere('brand_location_id', brandLocationId)
      .andWhere('status', mposDeviceStatus.PAIRED)
      .then(first);

    device.status = mposDeviceStatus.DELETED;
    await this.save(device);
    return device;
  }

  async unpairDevice(deviceId) {
    const device = await this.roDb(this.tableName)
      .select('*')
      .where('device_id', deviceId)
      .andWhere('status', mposDeviceStatus.PAIRED)
      .then(first);

    if (!device) {
      SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/logout] Unknown device (${deviceId}) requesting data, request has been denied.`, mposWebhookUrl);
      return false;
    }
    device.status = mposDeviceStatus.DELETED;
    await this.save(device);
    return true;
  }

  async getPairedDeviceList({ countryId }) {
    let pairedDeviceList = await super
      .getAll()
      .where('status', mposDeviceStatus.PAIRED)
      .orderBy('created', 'desc');
    if (pairedDeviceList.length > 0) {
      const brandLocationIds = [];
      pairedDeviceList = pairedDeviceList.map(device => {
        if (!brandLocationIds.includes(device.brandLocationId)) {
          brandLocationIds.push(device.brandLocationId);
        }
        return device;
      });
      const select = `bl.id as brand_location_id, bl.name as brand_location_name, bl.name_ar as brand_location_name_ar, bl.name_tr as brand_location_name_tr,
      b.name as brand_name, b.name_ar as brand_name_ar, b.name_tr as brand_name_tr, b.id as brand_id, b.country_id`;
      const query = this.roDb('brand_locations as bl')
        .select(this.db.raw(select))
        .leftJoin('brands AS b', 'b.id', 'bl.brand_id')
        .whereIn('bl.id', brandLocationIds);
      if (countryId) query.where('b.country_id', countryId);
      let brandLocationList = await query;
      brandLocationList = addLocalizationField(
        addLocalizationField(brandLocationList, 'brandLocationName'),
        'brandName'
      );

      pairedDeviceList = await Promise.all(
        brandLocationList.map(bl => {
          const device = find(pairedDeviceList, {
            brandLocationId: bl.brandLocationId,
          });
          bl = { ...device, ...bl };
          return bl;
        })
      );
    }

    return pairedDeviceList;
  }

  async getNewOrders(deviceId, limit, page, serialNumber, appVersion) {
    const device = await this.roDb(this.tableName)
      .select('*')
      .where('device_id', deviceId)
      .andWhere('status', mposDeviceStatus.PAIRED)
      .then(first);

    if (!device) {
      SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/new-orders] Unknown device (${deviceId}) requesting data, request has been denied.`, mposWebhookUrl);
      return { success: false, message: 'Invalid Device' };
    }

    /** WILL REMOVE with next BaristaAPP version release */
    if ((typeof serialNumber === 'string' && !isEmpty(serialNumber)) || (typeof appVersion === 'string' && !isEmpty(appVersion))) {
      const appVersionRegex = new RegExp(/^\d{1,3}(\.\d{1,2}\.\d{1,2})?$/);
      const serialNumberRegex = new RegExp(/(?=[A-Z0-9]{10,35}$)^(?=.*[A-Z])(?=.*[0-9]).*$/);
      const updateValue = {};
      let slackText = '';
      if (!isEmpty(appVersion)) {
        if (appVersionRegex.test(appVersion)) {
          if (!device.appVersion || device.appVersion != appVersion) {
            updateValue.appVersion = appVersion;
          }
        } else slackText = `Invalid appVersion(${appVersion})`;
      }
      if (!isEmpty(serialNumber)) {
        if (serialNumberRegex.test(serialNumber)) {
          if (!device.serialNumber || device.serialNumber != serialNumber) {
            const [{count}] = await this.roDb(this.tableName)
              .count()
              .where('serial_number', serialNumber)
              .andWhere('status', mposDeviceStatus.PAIRED)
              .whereNot('id', device.id);
            if (count > 0) {
              SlackWebHookManager.sendTextToSlack(`[LOG] [${env}] [/status] This serialNumber(${serialNumber}) is already used another paired device/s. Device (${deviceId}).`, mposWebhookUrl);
            } else updateValue.serialNumber = serialNumber;
          }
        } else slackText += (isEmpty(slackText) ? 'Invalid' : ' and') + ` serialNumber(${serialNumber})`;
      }
      if (!isEmpty(updateValue)) {
        try {
          const [{serialNumber: updatedSerialNumber, appVersion: updatedAppVersion }] = await this.db(this.tableName)
            .where('id', device.id)
            .update(updateValue, ['serial_number', 'app_version']);
          if (('serialNumber' in updateValue && updatedSerialNumber != serialNumber) || ('appVersion' in updateValue && updatedAppVersion != appVersion)) {
            SlackWebHookManager.sendTextToSlack(`[LOG] [${env}] [/status] serialNumber(${serialNumber}) or appVersion(${appVersion}) can not be updated for that device (${deviceId}).`, mposWebhookUrl);
          }
        } catch (error) {
          SlackWebHookManager.sendTextAndErrorToSlack(`[LOG] [${env}] [/status] serialNumber(${serialNumber}) and appVersion(${appVersion}) can not be updated for that device (${deviceId}).`, error, mposWebhookUrl);
        }
      }
      if (!isEmpty(slackText)) {
        SlackWebHookManager.sendTextToSlack(`[LOG] [${env}] [/status] ${slackText} for that device (${deviceId}).`, mposWebhookUrl);
      }
    }

    const lastRequestTime = moment();
    await this.db(this.tableName)
      .update({ lastRequestTime })
      .where('id', device.id);
    const newOrders = await this.context.orderSet.getNewOrderSetsByBrandLocation(
      device.brandLocationId, limit, page
    );
    return { success: true, orders: newOrders.orders, pagination: newOrders.pagination };
  }

  async getPastOrders(deviceId, limit, page, shortCode) {
    const device = await this.roDb(this.tableName)
      .select('*')
      .where('device_id', deviceId)
      .andWhere('status', mposDeviceStatus.PAIRED)
      .then(first);

    if (!device) {
      SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/past-orders] Unknown device (${deviceId}) requesting data, request has been denied.`, mposWebhookUrl);
      return { success: false, message: 'Invalid Device' };
    }
    const pastOrders = await this.context.orderSet.getPastOrderSetsByBrandLocation(
      device.brandLocationId,
      limit,
      page,
      shortCode
    );
    return { success: true, orders: pastOrders.orders, pagination: pastOrders.pagination };
  }

  async getOrderDetail(deviceId, orderSetId) {
    const device = await this.roDb(this.tableName)
      .select('*')
      .where('device_id', deviceId)
      .andWhere('status', mposDeviceStatus.PAIRED)
      .then(first);

    if (!device) {
      SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/order-detail] Unknown device (${deviceId}) requesting data, request has been denied.`, mposWebhookUrl);
      return { success: false, message: 'Invalid Device' };
    }

    const order = await this.context.orderSet.getOrderDetailWithBrandLocation(
      device.brandLocationId,
      orderSetId
    );
    if (!order) {
      SlackWebHookManager.sendTextToSlack(`[ERROR] [${env}] [/order-detail] Unknown order (${orderSetId}) for the device (${deviceId}), request has been denied.`, mposWebhookUrl);
      return { success: false, message: 'Order can not found!!!' };
    }
    if (order.usedPerks && order.usedPerks.length > 0) {
      order.usedPerks = await Promise.all(
        order.usedPerks.map(async usedPerk => {
          if (usedPerk.rewardId) {
            const customerTier = await this.context.customerTier.getCurrentTier(
              order.customerId,
              usedPerk.rewardId
            );
            const rewardTier = await this.context.rewardTier.getById(customerTier.rewardTierId);
            usedPerk.rewardTitle = (addLocalizationField(rewardTier, 'title')).title;
            usedPerk.rewardType = rewardTier.type;
          }
          return usedPerk;
        })
      );
    }
    order.items = order.items.map(item => {
      item.price = item.selectedOptions.reduce((a, option) => a + parseFloat(option.price), 0);
      return item;
    });
    return { status: true, success: true, order };
  }

  async getStatus(deviceId, serialNumber, appVersion) {
    const device = await this.roDb(this.tableName)
      .select('*')
      .where('device_id', deviceId)
      .orderBy('created', 'desc')
      .then(first);

    if (!device) {
      SlackWebHookManager.sendTextToSlack(`[LOG] [${env}] [/status] Unknown device (${deviceId}) requesting data, request has been denied.`, mposWebhookUrl);
      return { success: false, message: 'Invalid Device' };
    }

    /** WILL TRANSFERED to code and branch-status endpoint whit next BaristaAPP version release */
    if ((typeof serialNumber === 'string' && !isEmpty(serialNumber)) || (typeof appVersion === 'string' && !isEmpty(appVersion))) {
      const appVersionRegex = new RegExp(/^\d{1,3}(\.\d{1,2}\.\d{1,2})?$/);
      const serialNumberRegex = new RegExp(/(?=[A-Z0-9]{10,35}$)^(?=.*[A-Z])(?=.*[0-9]).*$/);
      const updateValue = {};
      let slackText = '';
      if (!isEmpty(appVersion)) {
        if (appVersionRegex.test(appVersion)) {
          if (!device.appVersion || device.appVersion != appVersion) {
            updateValue.appVersion = appVersion;
          }
        } else slackText = `Invalid appVersion(${appVersion})`;
      }
      if (!isEmpty(serialNumber)) {
        if (serialNumberRegex.test(serialNumber)) {
          if (!device.serialNumber || device.serialNumber != serialNumber) {
            const [{count}] = await this.roDb(this.tableName)
              .count()
              .where('serial_number', serialNumber)
              .andWhere('status', mposDeviceStatus.PAIRED)
              .whereNot('id', device.id);
            if (count > 0) {
              SlackWebHookManager.sendTextToSlack(`[LOG] [${env}] [/status] This serialNumber(${serialNumber}) is already used another paired device/s. Device (${deviceId}).`, mposWebhookUrl);
            } else updateValue.serialNumber = serialNumber;
          }
        } else slackText += (isEmpty(slackText) ? 'Invalid' : ' and') + ` serialNumber(${serialNumber})`;
      }
      if (!isEmpty(updateValue)) {
        try {
          const [{serialNumber: updatedSerialNumber, appVersion: updatedAppVersion }] = await this.db(this.tableName)
            .where('id', device.id)
            .update(updateValue, ['serial_number', 'app_version']);
          if (('serialNumber' in updateValue && updatedSerialNumber != serialNumber) || ('appVersion' in updateValue && updatedAppVersion != appVersion)) {
            SlackWebHookManager.sendTextToSlack(`[LOG] [${env}] [/status] serialNumber(${serialNumber}) or appVersion(${appVersion}) can not be updated for that device (${deviceId}).`, mposWebhookUrl);
          }
        } catch (error) {
          SlackWebHookManager.sendTextAndErrorToSlack(`[LOG] [${env}] [/status] serialNumber(${serialNumber}) and appVersion(${appVersion}) can not be updated for that device (${deviceId}).`, error, mposWebhookUrl);
        }
      }
      if (!isEmpty(slackText)) {
        SlackWebHookManager.sendTextToSlack(`[LOG] [${env}] [/status] ${slackText} for that device (${deviceId}).`, mposWebhookUrl);
      }
    }
    return { success: true, status: device.status };
  }

  async acceptOrder(deviceId, orderSetId) {
    const device = await this.roDb(this.tableName)
      .select('status')
      .where('device_id', deviceId)
      .andWhere('status', mposDeviceStatus.PAIRED)
      .orderBy('created', 'desc')
      .then(first);
    if (!device) {
      SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/order-status-accepted] Unknown device (${deviceId}) requesting data, request has been denied.`, mposWebhookUrl);
      return { success: false, message: 'Invalid Device' };
    }

    const order = await this.isValidOrder(
      deviceId,
      orderSetId,
      orderSetStatusNames.PLACED
    );
    if (!order) {
      SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/order-status-accepted] The device (${deviceId}) requested the status to be ACCEPTED in the order (${orderSetId}) that does not have PLACED status.`, mposWebhookUrl);
      return { success: false, message: `The device (${deviceId}) requested the status to be ACCEPTED in the order (${orderSetId}) that does not have PLACED status.` };
    }

    try {
      await sqs.sendMessage({
        status: 'ACCEPTED',
        orderId: orderSetId,
      });
      const context = this.context;
      await this.context.orderSetStatus.activateDeliveryOnAccepted(
        orderSetId,
        context
      );
      const notifs = await notificationsForStatusChange(
        orderSetId,
        orderSetStatusNames.ACCEPTED,
        context
      );
      /**
      *  New Barista app has not subscription part. That's why it is removed
      * */

      const arrivingInfo = await this.context.arrivingTime.getByOrderSetId(orderSetId);
      const anHourAgo = moment().subtract(60, 'm');
      if (arrivingInfo && anHourAgo.isSameOrBefore(moment(arrivingInfo.arrivalTime)) &&
          (arrivingInfo.arrived || (!arrivingInfo.arrived && moment(arrivingInfo.arrivalTime).isSameOrBefore(moment())))
      ) {
        const {shortCode} = await this.context.orderSet.getById(orderSetId);
        const redisKey = calculateArrivedOrderKey(orderSetId);
        const arrivedOrder = await getCachedArrivedOrder(redisKey);
        if (!arrivedOrder) {
          const orderArrived = {
            orderSetId: arrivingInfo.orderSetId,
            fulfillmentType: arrivingInfo.fulfillmentType,
            shortCode,
            arrivalTime: arrivingInfo.arrivalTime,
            deviceId
          };
          //await saveCachedArrivedOrder(redisKey);
          await publishMposSubscriptionEvent(
            context,
            orderArrived,
            mposOrderSubscriptionEvent.ARRIVED_ORDER
          );
        }
      }
      await this.context.notification.createAllIn(notifs);
      await this.context.driver.sendSMSToDriver(orderSetId);
      return {
        success: true,
      };
    } catch (err) {
      SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/order-status-accepted] Process failed for the device (${deviceId}) and the order (${orderSetId})`, mposWebhookUrl);
      return {
        success: false,
        message: 'Process failed. Error:' + err,
      };
    }
  }

  async preparingOrder(deviceId, orderSetId) {
    const device = await this.roDb(this.tableName)
      .select('status')
      .where('device_id', deviceId)
      .andWhere('status', mposDeviceStatus.PAIRED)
      .orderBy('created', 'desc')
      .then(first);

    if (!device) {
      SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/order-status-preparing] Unknown device (${deviceId}) requesting data, request has been denied.`, mposWebhookUrl);
      return { success: false, message: 'Invalid Device' };
    }

    const order = await this.isValidOrder(
      deviceId,
      orderSetId,
      orderSetStatusNames.ACCEPTED
    );
    if (!order) {
      SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/order-status-preparing] The device (${deviceId}) requested a status change in the order (${orderSetId}) that does not have ACCEPTED status.`, mposWebhookUrl);
      return { success: false, message: `The device (${deviceId}) requested a status change in the order (${orderSetId}) that does not have ACCEPTED status.` };
    }

    try {
      //const orderSet = await this.context.orderSet.getById(orderSetId);
      const orderSet = await this.roDb('order_sets as os')
        .select('os.payment_method', 'os.brand_location_id', 'of.type', 'osat.selected_option', 'osat.arrival_time', 'osat.arrived')
        .leftJoin('order_set_arriving_times as osat', 'osat.order_set_id', 'os.id')
        .leftJoin('order_fulfillment as of', 'of.order_set_id', 'os.id')
        .where('os.id', orderSetId)
        .then(first);
      let hasDriver = false;
      if (orderSet.type == orderTypes.EXPRESS_DELIVERY) {
        const driversInfo = await this.context.driver.getDriversByBranchId(orderSet.brandLocationId);
        hasDriver = driversInfo.length > 0;
      }
      await sqs.sendMessage({
        status: 'PREPARING',
        orderId: orderSetId,
        isCashOrder: orderSet.paymentMethod === orderPaymentMethods.CASH,
        isArrivedOrder: orderSet.arrivalTime !== null,
        hasDriver
      });
      /*
      await sqs.sendMessage(
        {
          status: 'COMPLETED',
          orderId: orderSetId,
        },
        900
      );
      */
      return {
        success: true,
      };
    } catch (err) {
      SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/order-status-preparing] Process failed for the device (${deviceId}) and the order (${orderSetId})`, mposWebhookUrl);
      return {
        success: false,
        message: 'Process failed. Error:' + err,
      };
    }
  }

  async completeOrders(orderSetIds) {
    try {
      await Promise.all(
        orderSetIds.map(async orderSetId => {
          if (isUUID.v4(orderSetId)) {
            const orderSet = await this.context.orderSet.getById(orderSetId);
            // Add reward point if order is in a reward system
            // Must be moved to lambda or microservice otherwise there is no benefit.
            if (orderSet) {
              orderSet.items = await this.context.orderItem.getByOrderSetId(orderSetId);
              const isRewardAdded = await this.context.rewardPointsTransaction.addPointsForOrderSet(orderSet);
              const isReferralAdded = await this.context.referral.rewardReferralSender({ orderSetId });
              const isStampRewardAdded = await this.context.stampRewardCustomer.checkAndUpdateCustomerStampReward(orderSet.customerId, orderSetId, 'MPOS');
              const brandLocation = await this.context.brandLocation.getById(
                orderSet.brandLocationId
              );
              if (orderSet.paymentMethod === orderPaymentMethods.CASH) {
                await this.context.orderSet.addCashback(orderSetId);

                await this.context.transaction.save({
                  referenceOrderId: orderSetId,
                  orderType: paymentStatusOrderType.ORDER_SET,
                  action: transactionAction.ORDER,
                  type: transactionType.DEBITED,
                  customerId: orderSet.customerId,
                  currencyId: brandLocation.currencyId,
                  amount: orderSet.amountDue,
                });
              }
              const brand = await this.context.brand.getById(brandLocation.brandId);
              const eventProperties = {
                customerId: orderSet.customerId,
                brandName: brand.name,
                branchId: brandLocation.id,
                paymentType: mapPaymentMethod(orderSet.paymentMethod),
                total: orderSet.total,
              };

              // console.log('order completed braze event brand data', brand);
              publishVerifiedEmailToBraze(null, {
                // eslint-disable-next-line camelcase
                external_id: orderSet.customerId,
                time: new Date().toString(),
                name: 'completed_order',
                properties: eventProperties,
              });
              await this.context.customer.getFavoriteBrandLast30Days(orderSet.customerId);
              await this.context.customer.sendPurchaseEvent(
                orderSet,
                orderSet.items,
                brand
              );

              const customerDefaultDevice = await this.context.deviceMetadata.getDefaultByCustomer(
                orderSet.customerId
              );

              publishEvent(
                EventType.ORDER_COMPLETED,
                {
                  orderType: paymentStatusOrderType.ORDER_SET,
                  referenceOrderId: orderSetId,
                },
              ).catch(err => console.error(err));

              // TOTAL_ORDER_COMPLETED *******/
              sendCustomerEvent(
                orderSet.customerId,
                customerDefaultDevice,
                customerAnalyticsEvents.TOTAL_ORDER_COMPLETED,
                orderSet.items.length
              );
              /*******************************/

              // FIRST_ORDER_COMPLETED *******/
              const [{ count }] = await this.context.db(this.context.orderSet.tableName)
                .where('customer_id', orderSet.customerId)
                .count();

              if (Number(count) === 1) {
                sendCustomerEvent(
                  orderSet.customerId,
                  customerDefaultDevice,
                  customerAnalyticsEvents.FIRST_ORDER_COMPLETED,
                  orderSet.items.length
                );
              }
              /*******************************/

              // REWARDS_REDEMPTION **********/
              const customerUsedPerks = await this.context.customerUsedPerk.getByOrderSetId(
                orderSet.id
              );

              if (customerUsedPerks && customerUsedPerks.length > 0) {
                for (const customerUsedPerk of customerUsedPerks) {
                  if (customerUsedPerk && customerUsedPerk.status === 1) {
                    sendCustomerEvent(
                      orderSet.customerId,
                      customerDefaultDevice,
                      customerAnalyticsEvents.REWARDS_REDEMPTION,
                      orderSet.items.length,
                      customerUsedPerk.type
                    );
                  }
                }
              }
              SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/order-status-completed] Referral and rewards point process completed for the order (${orderSetId}), isRewardAdded:${isRewardAdded}, isReferralAdded:${isReferralAdded} isStampRewardAdded:${isStampRewardAdded}`, mposWebhookUrl);
              /** SUBSCRIPTION_ORDER_FINISH_CHECK */
              const subscriptionInfo = orderSet.prePaid?.subscription;
              if (subscriptionInfo) {
                const subscriptionIds = map(subscriptionInfo, subs => subs.id);
                if (subscriptionIds && subscriptionIds.length > 0) {
                  for (const subscriptionId of subscriptionIds) {
                    await this.context.cSubscriptionCustomerTransaction
                      .finishSubscriptionIfNoUsageRemaining({
                        customerId: orderSet.customerId,
                        subscriptionId,
                      });
                  }
                }
              }
              const arrivingInfo = await this.context.arrivingTime.getByOrderSetId(orderSetId);
              const device = await this.getDeviceByBrandLocationId(arrivingInfo.branchId);
              if (arrivingInfo) {
                const context = this.context;
                await publishMposSubscriptionEvent(
                  context,
                  { orderSetId, deviceId: device.deviceId },
                  mposOrderSubscriptionEvent.COMPLETED_ORDER
                );
              }
            }
          }
        })
      );
      return {
        success: true,
      };
    } catch (error) {
      SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/order-status-completed] Process failed for the order (${orderSetIds})`, mposWebhookUrl);
      return {
        success: false,
        message: 'Process failed. Error:' + error,
      };
    }
  }

  async sendNotificationOrders(orderSetIds) {
    try {
      await Promise.all(
        orderSetIds.map(async orderSetId => {
          if (isUUID.v4(orderSetId)) {
            const orderSet = await this.context.orderSet
              .selectFields(['current_status'])
              .where('id', orderSetId)
              .orderBy('created_at', 'desc')
              .first();
            //const orderSet = await this.context.orderSet.getById(orderSetId);
            // Add reward point if order is in a reward system
            // Must be moved to lambda or microservice otherwise there is no benefit.
            const context = this.context;
            if (orderSet) {
              const notifs = await notificationsForStatusChange(
                orderSetId,
                orderSet.currentStatus,
                context
              );
              await this.context.notification.createAllIn(notifs);
            }
          }
        })
      );
      return {
        success: true,
      };
    } catch (error) {
      console.log(error);
      SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/status-update-notification] Process failed for the order (${orderSetIds})`, mposWebhookUrl);
      return {
        success: false,
        message: 'Process failed. Error:' + error,
      };
    }
  }

  async rejectedOrder(deviceId, orderSetId, rejectedReason) {
    const device = await this.roDb(this.tableName)
      .select('status')
      .where('device_id', deviceId)
      .andWhere('status', mposDeviceStatus.PAIRED)
      .orderBy('created', 'desc')
      .then(first);

    if (!device) {
      SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/order-status-rejected] Unknown device (${deviceId}) requesting data, request has been denied.`, mposWebhookUrl);
      return { success: false, message: 'Invalid Device' };
    }

    const order = await this.isValidOrder(
      deviceId,
      orderSetId,
      orderSetStatusNames.PLACED
    );
    if (!order) {
      SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/order-status-rejected] The device (${deviceId}) requested the status to be REJECTED in the order (${orderSetId}) that does not have PLACED status.`, mposWebhookUrl);
      return { success: false, message: `The device (${deviceId}) requested the status to be REJECTED in the order (${orderSetId}) that does not have PLACED status.` };
    }

    const rejectionInfo = {
      reason: rejectedReason,
      note: '',
    };
    try {
      const { statusId } = await this.context.orderSetStatus.rejectOrder(
        orderSetId,
        rejectionInfo
      );
      if (statusId) {
        // Added notification for reject order
        const context = this.context;
        const notifs = await notificationsForStatusChange(
          orderSetId,
          orderSetStatusNames.REJECTED,
          context
        );
        await this.context.notification.createAllIn(notifs);
        return {
          success: true,
          statusId,
        };
      }
    } catch (err) {
      SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/order-status-rejected] Process failed for the device (${deviceId}) and the order (${orderSetId})`, mposWebhookUrl);
      return {
        success: false,
        message: 'Process failed. Error:' + err,
      };
    }
  }

  async reportedOrder(deviceId, orderSetId, reportedReason) {
    const device = await this.roDb(this.tableName)
      .select('status')
      .where('device_id', deviceId)
      .andWhere('status', mposDeviceStatus.PAIRED)
      .orderBy('created', 'desc')
      .then(first);

    if (!device) {
      SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/order-status-reported] Unknown device (${deviceId}) requesting data, request has been denied.`, mposWebhookUrl);
      return { success: false, message: 'Invalid Device' };
    }

    const order = await this.isValidOrder(
      deviceId,
      orderSetId,
      null
    );
    // After added waiting for courier remove preparing case
    const reportableOrderStatuses = [
      orderSetStatusNames.PREPARING,
      orderSetStatusNames.WAITING_FOR_COURIER,
      orderSetStatusNames.OUT_FOR_DELIVERY,
      orderSetStatusNames.DELIVERED,
      orderSetStatusNames.READY_FOR_PICKUP,
      orderSetStatusNames.COMPLETED
    ];
    if (!order || !reportableOrderStatuses.includes(order.currentStatus)) {
      SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/order-status-reported] The device (${deviceId}) requested the status to be REPORTED in the order (${orderSetId}) that does not have reportable status.`, mposWebhookUrl);
      return { success: false, message: `The device (${deviceId}) requested the status to be REPORTED in the order (${orderSetId}) that does not have reportable status.` };
    }

    const reportInfo = {
      reason: reportedReason,
      note: '',
    };
    try {
      const { statusId } = await this.context.orderSetStatus.createReportForOrderSetId(
        orderSetId,
        reportInfo
      );
      return {
        success: true,
        statusId,
      };
    } catch (err) {
      SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/order-status-reported] Process failed for the device (${deviceId}) and the order (${orderSetId})`, mposWebhookUrl);
      return {
        success: false,
        message: 'Process failed. Error:' + err,
      };
    }
  }

  async getDevicesByBrandLocation(brandLocationId) {
    return this.roDb(this.tableName)
      .select('*')
      .where('brand_location_id', brandLocationId)
      .andWhere('status', mposDeviceStatus.PAIRED);
  }

  async getAuthenticationWithDeviceId(deviceId) {
    const device = await this.roDb(this.tableName)
      .select('*')
      .where('device_id', deviceId)
      .andWhere('status', mposDeviceStatus.PAIRED)
      .then(first);

    if (!device) {
      return { success: false, message: 'Invalid Device' };
    }
    return null;
    /*
    const vendorAdmin = await this.db('brand_admins')
      .select('*')
      .where('brand_location_id', vendorAdmin.id ) //'be9947c3-82e3-412f-ac19-33dfe0f9fd79'
      .then(first);
    */
    /*
      // Maybe we can do it
      // Choose an admin and got data
      // After add to id to auth and call generateToken
      this.context.auth = { "id":vendorAdmin.id};
      let authentication = await this.context.authService.generateToken(context);
    */
    /* Or targetId is VENDOR_ADMIN_ID
      const customToken = await admin.auth().createCustomToken(vendorAdmin.id);
      console.log(customToken)
    */
  }

  async isValidOrder(deviceId, orderSetId, currentStatus) {
    const query = this.roDb
      .select(this.roDb.raw('bld.*, os.id as order_set_id, os.current_status'))
      .from('brand_location_devices as bld')
      .join('order_sets as os', 'bld.brand_location_id', 'os.brand_location_id')
      .where('bld.device_id', deviceId)
      .andWhere('bld.status', mposDeviceStatus.PAIRED)
      .andWhere('os.id', orderSetId)
      .andWhereRaw('os.created_at >= (now() - INTERVAL \'1 day\')');
    if (currentStatus) {
      query.andWhereRaw(
        `(os.current_status = '${currentStatus}'::order_set_statuses_enum)`
      );
    }
    const order = await query.then(first);
    return order;
  }

  async getBranchDetail(deviceId) {
    const device = await this.roDb(this.tableName)
      .select('*')
      .where('device_id', deviceId)
      .andWhere('status', mposDeviceStatus.PAIRED)
      .then(first);

    if (!device) {
      SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/branch-status] Unknown device (${deviceId}) requesting data, request has been denied.`, mposWebhookUrl);
      return { success: false, message: 'Invalid Device' };
    }

    const select = `bl.id as brand_location_id, bl.name as brand_location_name, bl.name_ar as brand_location_name_ar, bl.name_tr as brand_location_name_tr,
      b.name as brand_name, b.name_ar as brand_name_ar, b.name_tr as brand_name_tr, b.id as brand_id, bl.accepting_orders,
      bl.has_pickup, bl.allow_deliver_to_car, bl.has_delivery, bl.allow_express_delivery, (b.auto_order_accept and bl.auto_order_accept) as auto_order_accept`;
    let branch = await this.roDb('brand_locations as bl')
      .select(this.db.raw(select))
      .leftJoin('brands AS b', 'b.id', 'bl.brand_id')
      .where('bl.id', device.brandLocationId)
      .then(first);

    if (!branch) {
      SlackWebHookManager.sendTextToSlack(`[ERROR] [${env}] [/branch-status] Unknown order (${device.brandLocationId}) for the device (${deviceId}), request has been denied.`, mposWebhookUrl);
      return { success: false, message: 'Branch can not found!' };
    }
    //const weeklySchedules = await this.context.weeklySchedule.getByBrandLocation(device.brandLocationId);
    const weeklySchedules = await this.context.brandLocationWeeklySchedule.getByBrandLocationId(device.brandLocationId);
    const closeAllDay = {closeAllDay: true};
    const schedules = [];
    const availableFulfilments = {
      pickup: branch.hasPickup,
      car: branch.allowDeliverToCar,
      delivery: branch.hasDelivery,
      expressDelivery: branch.allowExpressDelivery,
    };
    /** TODO: schedule info is array field and we can store multiple schedule
     * But Barista APP can not support multiple field
     * for now backend only return first element of array
    */
    for (let i = 0; i < 7; i++) {
      let obj = {day: i + 1};
      const schedule = weeklySchedules.find(schedule => schedule.day === i);
      if (schedule) {
        const serviceTime = {openTime: '00:00:00', openDuration: 1440, openAllDay: true };
        if (branch.hasPickup) {
          if (schedule.pickupOpenAllDay) {
            obj = { ...obj, pickup: serviceTime};
          } else if (schedule.pickupScheduleInfo) {
            const openTime = (schedule.pickupScheduleInfo[0].openTime).split(':').length == 2 ?
              (schedule.pickupScheduleInfo[0].openTime + ':00') :
              schedule.pickupScheduleInfo[0].openTime;
            obj = { ...obj, pickup: {
              openTime,
              openDuration: schedule.pickupScheduleInfo[0].openDuration,
              openAllDay: schedule.pickupScheduleInfo[0].openDuration == 1440
            }};
          } else {
            obj = { ...obj, pickup: closeAllDay};
          }
          /*
          obj = { ...obj, 'pickup': schedule.pickupOpenAllDay
            ? serviceTime :
            (schedule.pickupScheduleInfo ?
              {openTime: schedule.pickupScheduleInfo[0].openTime, openDuration: schedule.pickupScheduleInfo[0].openDuration, openAllDay: schedule.pickupScheduleInfo[0].openDuration == 1440 }
              : closeAllDay)
          };*/
        }
        if (branch.allowDeliverToCar) {
          if (schedule.carOpenAllDay) {
            obj = { ...obj, car: serviceTime};
          } else if (schedule.carScheduleInfo) {
            const openTime = (schedule.carScheduleInfo[0].openTime).split(':').length == 2 ?
              (schedule.carScheduleInfo[0].openTime + ':00') :
              schedule.carScheduleInfo[0].openTime;
            obj = { ...obj, car: {
              openTime,
              openDuration: schedule.carScheduleInfo[0].openDuration,
              openAllDay: schedule.carScheduleInfo[0].openDuration == 1440
            }};
          } else {
            obj = { ...obj, car: closeAllDay};
          }
        }
        if (branch.hasDelivery) {
          if (schedule.deliveryOpenAllDay) {
            obj = { ...obj, delivery: serviceTime};
          } else if (schedule.deliveryScheduleInfo) {
            const openTime = (schedule.deliveryScheduleInfo[0].openTime).split(':').length == 2 ?
              (schedule.deliveryScheduleInfo[0].openTime + ':00') :
              schedule.deliveryScheduleInfo[0].openTime;
            obj = { ...obj, delivery: {
              openTime,
              openDuration: schedule.deliveryScheduleInfo[0].openDuration,
              openAllDay: schedule.deliveryScheduleInfo[0].openDuration == 1440
            }};
          } else {
            obj = { ...obj, delivery: closeAllDay};
          }
        }
        if (branch.allowExpressDelivery) {
          if (schedule.expressDeliveryOpenAllDay) {
            obj = { ...obj, expressDelivery: serviceTime};
          } else if (schedule.expressDeliveryScheduleInfo) {
            const openTime = (schedule.expressDeliveryScheduleInfo[0].openTime).split(':').length == 2 ?
              (schedule.expressDeliveryScheduleInfo[0].openTime + ':00') :
              schedule.expressDeliveryScheduleInfo[0].openTime;
            obj = { ...obj, expressDelivery: {
              openTime,
              openDuration: schedule.expressDeliveryScheduleInfo[0].openDuration,
              openAllDay: schedule.expressDeliveryScheduleInfo[0].openDuration == 1440
            }};
          } else {
            obj = { ...obj, expressDelivery: closeAllDay};
          }
        }

      } else {
        if (branch.hasPickup) obj = { ...obj, 'pickup': closeAllDay};
        if (branch.allowDeliverToCar) obj = { ...obj, 'car': closeAllDay};
        if (branch.hasDelivery) obj = { ...obj, 'delivery': closeAllDay};
        if (branch.allowExpressDelivery) obj = { ...obj, 'expressDelivery': closeAllDay};
      }
      schedules.push(obj);
    }
    /*
    for (let i = 1; i < 8; i++) {
      let obj = {day: i};
      const schedule = weeklySchedules.find(schedule => schedule.day === i);
      if (schedule) {
        const serviceTime = {openTime: '00:00:00', openDuration: 1440, openAllDay: true };
        if (branch.hasPickup) {
          obj = { ...obj, 'pickup': schedule.openAllDay
            ? serviceTime :
            (schedule.openTime ?
              {openTime: schedule.openTime, openDuration: schedule.openDuration, openAllDay: schedule.openDuration == 1440 }
              : closeAllDay)
          };
        }
        if (branch.allowDeliverToCar) {
          obj = { ...obj, 'car': schedule.openAllDay
            ? serviceTime :
            (schedule.openTime ?
              {openTime: schedule.openTime, openDuration: schedule.openDuration, openAllDay: schedule.openDuration == 1440 }
              : closeAllDay)
          };
        }
        if (branch.hasDelivery) {
          obj = { ...obj, 'delivery': schedule.openAllDay
            ? serviceTime :
            (schedule.deliveryOpenTime ? {openTime: schedule.deliveryOpenTime, openDuration: schedule.deliveryOpenDuration, openAllDay: schedule.deliveryOpenDuration == 1440 }
              : closeAllDay)
          };
        }
        if (branch.allowExpressDelivery) {
          obj = { ...obj, 'expressDelivery': schedule.openAllDay
            ? serviceTime :
            (schedule.expressDeliveryOpenTime ? {openTime: schedule.expressDeliveryOpenTime, openDuration: schedule.expressDeliveryOpenDuration, openAllDay: schedule.expressDeliveryOpenDuration == 1440 }
              : closeAllDay)
          };
        }
      } else {
        if (branch.hasPickup) obj = { ...obj, 'pickup': closeAllDay};
        if (branch.allowDeliverToCar) obj = { ...obj, 'car': closeAllDay};
        if (branch.hasDelivery) obj = { ...obj, 'delivery': closeAllDay};
        if (branch.allowExpressDelivery) obj = { ...obj, 'expressDelivery': closeAllDay};
      }
      schedules.push(obj);
    }
    */
    branch.schedules = schedules;
    branch.deviceCode = device.code;
    branch = omit(branch, ['hasPickup', 'allowDeliverToCar', 'hasDelivery', 'allowExpressDelivery']);
    branch.availableFulfilments = availableFulfilments;
    return { success: true, branch };
  }

  async getBranchMenuItems(deviceId) {
    const device = await this.roDb(this.tableName)
      .select('*')
      .where('device_id', deviceId)
      .andWhere('status', mposDeviceStatus.PAIRED)
      .then(first);

    if (!device) {
      SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/branch-items] Unknown device (${deviceId}) requesting data, request has been denied.`, mposWebhookUrl);
      return { success: false, message: 'Invalid Device' };
    }

    const brand = await this.context.brand.getByBrandLocation(device.brandLocationId);
    if (!brand) {
      SlackWebHookManager.sendTextToSlack(`[ERROR] [${env}] [/branch-items] Unknown brand (${device.brandLocationId}) for the device (${deviceId}), request has been denied.`, mposWebhookUrl);
      return { success: false, message: 'Brand can not found!' };
    }
    const menu = await this.context.menu.getByBrandAndCountry(
      brand.id,
      brand.countryId
    );
    if (!menu) {
      SlackWebHookManager.sendTextToSlack(`[ERROR] [${env}] [/branch-items] Unknown menu (${device.brandLocationId}) for the device (${deviceId}), request has been denied.`, mposWebhookUrl);
      return { success: false, message: 'Menu can not found!' };
    }
    let sections = await this.context.menuSection.getByMenu(menu.id);
    if (sections.length === 0) {
      menu.sections = [];
      return menu;
    }
    sections = sections.filter(section => section.status == menuItemStatus.ACTIVE);
    const sectionIds = sections.map(section => section.id);
    const items = await this.roDb('menu_items as mi')
      .select(
        this.roDb.raw(`
          mi.section_id,
          mi.id,
          mi.name,
          mi.name_ar,
          mi.name_tr,
          mi.sort_order,
          mi.type,
          CASE
          WHEN mi.status = 'INACTIVE' THEN 'NOT_COMMERCIALIZED'
          ELSE (
            CASE 
            WHEN blumi.state IS NULL THEN 'AVAILABLE'
            ELSE blumi.state END
          )
          END AS state`)
      )
      .joinRaw('left join brand_locations_unavailable_menu_items blumi on mi.id = blumi.menu_item_id and blumi.brand_location_id = ?', [device.brandLocationId])
      .whereIn('mi.section_id', sectionIds);

    sections.map(async section => {
      section.items = filter(items, item => item.sectionId === section.id);
      return section;
    });
    menu.sections = sections;
    return menu;
  }

  async updateBrancMenuItemStatus(deviceId, menuItemIds, status) {
    const device = await this.roDb(this.tableName)
      .select('*')
      .where('device_id', deviceId)
      .andWhere('status', mposDeviceStatus.PAIRED)
      .then(first);

    if (!device) {
      SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/branch-item-status] Unknown device (${deviceId}) requesting data, request has been denied.`, mposWebhookUrl);
      return { success: false, message: 'Invalid Device' };
    }
    const response = await Promise.all(
      menuItemIds.map(async (menuItemId) => {
        if (!isUUID.v4(menuItemId)) return { menuItemId, isUpdated: false };
        const validationResult = await this.context.menuItem.validateAvailablity(
          menuItemId,
          device.brandLocationId
        );
        if (validationResult.length > 0) {
          return {menuItemId, isUpdated: false, error: validationResult[0]};
        }
        try {
          if (status === 'AVAILABLE') {
            await this.context.menuItem.setAvailability(
              menuItemId,
              device.brandLocationId,
              true
            );
          } else {
            await this.context.menuItem.setAvailability(
              menuItemId,
              device.brandLocationId,
              false,
              status === 'SOLD_OUT' ? menuItemUnavailableState.SOLD_OUT : menuItemUnavailableState.NOT_COMMERCIALIZED
            );
          }
          return { menuItemId, isUpdated: true };
        } catch (error) {
          return { menuItemId, isUpdated: false };
        }
      })
    );
    const allUpdated = response.every(item => item.isUpdated == true);
    let allFailed = false;
    if (!allUpdated) {
      allFailed = response.every(item => item.isUpdated == false);
    }
    return { success: !allFailed, message: allUpdated ? 'All menu items are updated' :
      (allFailed ? 'Update menu item process is failed' : 'Menu items are partial updated'), response};
  }

  async getBranchAvailability(deviceId) {
    const device = await this.roDb(this.tableName)
      .select('*')
      .where('device_id', deviceId)
      .andWhere('status', mposDeviceStatus.PAIRED)
      .then(first);

    if (!device) {
      SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/branch-availability] Unknown device (${deviceId}) requesting data, request has been denied.`, mposWebhookUrl);
      return { success: false, message: 'Invalid Device' };
    }
    const now = moment();
    if (now.isAfter(moment(device.offUntil))) {
      await this.context.brandLocation.setBrandLocationAcceptingOrders(device.brandLocationId, true, null);
      await this.db(this.tableName)
        .update({offUntil: null})
        .where('id', device.id)
        .andWhere('status', mposDeviceStatus.PAIRED);
      return { success: true, offUntil: null, storeStatus: 'ACCEPTING_ORDER', busyStatusByFulfillmentType: {
        'pickup': {
          'isBusy': false,
          'busyTime': null
        },
        'car': {
          'isBusy': false,
          'busyTime': null
        },
        'delivery': {
          'isBusy': false,
          'busyTime': null
        },
        'expressDelivery': {
          'isBusy': false,
          'busyTime': null
        }
      }};
    }
    const weekDay = now.day() + 1;
    const weeklySchedules = await this.context.weeklySchedule.getByBrandLocation(device.brandLocationId);
    let schedules = filter(weeklySchedules, schedule => schedule.day === weekDay);
    let closeAllDay = schedules.length === 0;
    if (closeAllDay) {
      const format = 'hh:mm:ss';
      let oneDayAgo = weekDay - 1;
      oneDayAgo = oneDayAgo == 0 ? 7 : oneDayAgo;
      schedules = weeklySchedules.filter(schedule => schedule.day === oneDayAgo);
      if (schedules.length > 0) {
        const brand = await this.context.brandLocation.getById(device.brandLocationId);
        const timeOffset = moment.tz(brand.timeZoneIdentifier).utcOffset() - moment().utcOffset();
        const schedule = schedules[0];
        const openTime = moment(schedule.openAllDay ? '00:00:00' : schedule.openTime, format).day(schedule.day - 1).subtract(timeOffset, 'm');
        const closeTime = openTime.clone().add(schedule.openAllDay ? 1440 : schedule.openDuration, 'm');
        closeAllDay = !now.isBetween(openTime, closeTime);
      }
    }
    const {acceptingOrders} = await this.roDb('brand_locations').select('accepting_orders').where('id', device.brandLocationId).then(first);
    const storeStatus = acceptingOrders ? (closeAllDay ? 'NOT_ACCEPTING_ORDER' : 'ACCEPTING_ORDER') : (device.offUntil ? 'BUSY' : 'NOT_ACCEPTING_ORDER');
    const busyStatus = storeStatus === 'BUSY';
    const busyStatusByFulfillmentType = {
      'pickup': {
        'isBusy': busyStatus,
        'busyTime': device.offUntil
      },
      'car': {
        'isBusy': busyStatus,
        'busyTime': device.offUntil
      },
      'delivery': {
        'isBusy': busyStatus,
        'busyTime': device.offUntil
      },
      'expressDelivery': {
        'isBusy': busyStatus,
        'busyTime': device.offUntil
      }};
    return { success: true, offUntil: device.offUntil, acceptingOrders, closeAllDay, storeStatus, busyStatusByFulfillmentType };
  }

  async updateBranchAvailabilityStatus(deviceId, acceptingOrder, offlineTime, isNewAppRequest, reason, body) {
    const device = await this.roDb(this.tableName)
      .select('*')
      .where('device_id', deviceId)
      .andWhere('status', mposDeviceStatus.PAIRED)
      .then(first);

    if (!device) {
      SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/update-branch-availability] Unknown device (${deviceId}) requesting data, request has been denied.`, mposWebhookUrl);
      return { success: false, message: 'Invalid Device' };
    }

    try {
      let offUntil = null;
      if (acceptingOrder) {
        await this.db(this.tableName)
          .where('id', device.id)
          .andWhere('status', mposDeviceStatus.PAIRED)
          .update({offUntil: null});
        await this.context.brandLocation.setBrandLocationAcceptingOrders(device.brandLocationId, acceptingOrder, null);
      } else {
        const now = moment();
        offUntil = now.clone();
        //console.log('Now', now);
        if (offlineTime === 'Indefinitely') {
          offUntil = await this.findUntilOffTime(now, device.brandLocationId);
        } else offUntil.add(offlineTime, 'm');
        //console.log('off until', offUntil);
        await this.db(this.tableName)
          .update({offUntil})
          .where('id', device.id)
          .andWhere('status', mposDeviceStatus.PAIRED);
        if (offUntil !== null) await this.context.brandLocation.setBrandLocationAcceptingOrders(device.brandLocationId, acceptingOrder, 'MPOS');
      }
      const variables = {...body, isNewAppRequest, reason, offlineTime};
      this.context.req.srcPlatform = 'BaristaAPP';
      this.context.req.body = {operationName: 'UpdateBranchAvailabilityStatus', variables };
      await this.context.userActivityLog.create({
        streamId: device.brandLocationId,
        stream: streams.BRANCH,
        action: streamActions.UPDATE
      });
      return { success: true, message: 'Branch Availability Updated',
        storeStatus: acceptingOrder ? 'ACCEPTING_ORDER' : (offUntil ? 'BUSY' : 'NOT_ACCEPTING_ORDER'),
        busyStatusByFulfillmentType: {
          'pickup': {
            'isBusy': !!offUntil,
            'busyTime': offUntil
          },
          'car': {
            'isBusy': !!offUntil,
            'busyTime': offUntil
          },
          'delivery': {
            'isBusy': !!offUntil,
            'busyTime': offUntil
          },
          'expressDelivery': {
            'isBusy': !!offUntil,
            'busyTime': offUntil
          }
        }
      };
    } catch (error) {
      SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/update-branch-availability] Something went wrong for device (${deviceId})`, mposWebhookUrl);
      return { success: false, message: 'Something went wrong', error };
    }
  }

  async getServiceDetail(deviceId) {
    const device = await this.roDb(this.tableName)
      .select('*')
      .where('device_id', deviceId)
      .andWhere('status', mposDeviceStatus.PAIRED)
      .then(first);

    if (!device) {
      SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/service-detail] Unknown device (${deviceId}) requesting data, request has been denied.`, mposWebhookUrl);
      return { success: false, message: 'Invalid Device' };
    }
    const contact = await this.roDb('countries as c')
      .select('c.dial_code', 'c.service_phone_number', 'c.id')
      .leftJoin('brands AS b', 'b.country_id', 'c.id')
      .leftJoin('brand_locations AS bl', 'b.id', 'bl.brand_id')
      .where('bl.id', device.brandLocationId)
      .then(first);

    if (!contact) {
      SlackWebHookManager.sendTextToSlack(`[ERROR] [${env}] [/service-detail] Unkown contact for device (${deviceId})`, mposWebhookUrl);
      return { success: false, message: 'Contact can not found!' };
    }
    return { success: true, contact };
  }

  async getArrivedOrders(deviceId) {
    const device = await this.roDb(this.tableName)
      .select('*')
      .where('device_id', deviceId)
      .andWhere('status', mposDeviceStatus.PAIRED)
      .then(first);

    if (!device) {
      SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/service-detail] Unknown device (${deviceId}) requesting data, request has been denied.`, mposWebhookUrl);
      return { success: false, message: 'Invalid Device' };
    }
    let orders = await this.roDb('order_set_arriving_times as osat')
      .select('osat.order_set_id', 'osat.fulfillment_type', 'os.short_code', 'osat.arrival_time', 'os.current_status', 'os.customer_id')
      .leftJoin('order_sets AS os', 'osat.order_set_id', 'os.id')
      .where('osat.branch_id', device.brandLocationId)
      .andWhereRaw(
        `(os.current_status <> '${orderSetStatusNames.INITIATED}'::order_set_statuses_enum AND
          os.current_status <> '${orderSetStatusNames.PLACED}'::order_set_statuses_enum AND
          os.current_status <> '${orderSetStatusNames.PAYMENT_CANCELED}'::order_set_statuses_enum AND
          os.current_status <> '${orderSetStatusNames.PAYMENT_FAILURE}'::order_set_statuses_enum AND
          os.current_status IS NOT NULL
        )`
      )
      .andWhereRaw(
        'osat.arrival_time > (now() - INTERVAL \'60 minutes\') and osat.arrival_time < now()'
      )
      .orderBy('osat.arrival_time', 'desc');

    const arrivedOrders = [];
    const completedOrders = [];
    if (orders.length > 0) {
      orders = await Promise.all(
        orders.map(async order => {
          const { firstName, lastName } = await this.roDb('customers').select('*').where('id', order.customerId).first();
          if ((firstName || lastName) && `${firstName}${lastName}`.length > 0) {
            order.customer = {
              firstName,
              lastName,
            };
          }
          const redisKey = calculateArrivedOrderKey(order.orderSetId);
          const arrivedOrder = await getCachedArrivedOrder(redisKey);
          if (!arrivedOrder) {
            await saveCachedArrivedOrder(redisKey);
            arrivedOrders.push(order);
          } else if (order.currentStatus === orderSetStatusNames.COMPLETED) {
            completedOrders.push(order);
          }
        })
      );
    }
    return { success: true, arrivedOrders, completedOrders };
  }

  async checkAndSendArrivedOrder(arrivingInfo) {
    const device = await this.getDeviceByBrandLocationId(arrivingInfo.branchId);
    if (device) {
      const { shortCode, currentStatus } = await this.context.orderSet.getById(arrivingInfo.orderSetId);
      if (!IGNORE_ARRIVED_STATUS.includes(currentStatus)) {
        const order = {
          orderSetId: arrivingInfo.orderSetId,
          fulfillmentType: arrivingInfo.fulfillmentType,
          shortCode,
          arrivalTime: arrivingInfo.arrivalTime,
          deviceId: device.deviceId
        };
        const context = this.context;
        //const redisKey = calculateArrivedOrderKey(arrivingInfo.orderSetId);
        //await saveCachedArrivedOrder(redisKey);
        await publishMposSubscriptionEvent(
          context,
          order,
          mposOrderSubscriptionEvent.ARRIVED_ORDER
        );
      } else SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [checkAndSendArrivedOrder] Arrived Order(${arrivingInfo.orderSetId}) Notification can not send. Order Status: ${currentStatus}`, mposWebhookUrl);
    }
  }

  async checkAndSendNewOrder(order) {
    const device = await this.getDeviceByBrandLocationId(order.brandLocationId);
    if (device) {
      /**
       * Check order with payment and type
       * Create order object like a getNewOrderSetsByBrandLocation in OrderSet
       */
      const context = this.context;
      await publishMposSubscriptionEvent(
        context,
        order,
        mposOrderSubscriptionEvent.NEW_ORDER
      );
    }
  }

  async findUntilOffTime(now, brandLocationId) {
    const weekDay = now.day() + 1;
    //console.log('Weekday', weekDay);
    const weeklySchedules = await this.context.weeklySchedule.getByBrandLocation(brandLocationId);
    const brand = await this.context.brandLocation.getById(brandLocationId);
    const timeOffset = moment.tz(brand.timeZoneIdentifier).utcOffset() - moment().utcOffset();
    //console.log('Timeofset', timeOffset);
    let schedules = filter(weeklySchedules, schedule => schedule.day === weekDay);
    const format = 'hh:mm:ss';
    if (schedules.length > 0) {
      const schedule = schedules[0];
      //console.log('S', schedule);
      const openTime = moment(schedule.openAllDay ? '00:00:00' : schedule.openTime, format).day(schedule.day - 1).subtract(timeOffset, 'm');
      const closeTime = openTime.clone().add(schedule.openAllDay ? 1440 : schedule.openDuration, 'm');
      //console.log('O', openTime, 'C', closeTime);
      if (now.isBetween(openTime, closeTime)) {
        //console.log('Between, close to ', closeTime);
        return closeTime;
      } else if (now.isBefore(openTime)) {
        //console.log('Before, close to ', openTime);
        return openTime;
      } else if (now.isAfter(closeTime)) {
        //console.log('Nothing do that');
        return null;
      }
    } else {
      //console.log('Schedule not found');
      let oneDayAgo = weekDay - 1;
      oneDayAgo = oneDayAgo == 0 ? 7 : oneDayAgo;
      schedules = weeklySchedules.filter(schedule => schedule.day === oneDayAgo);
      //console.log('S',schedules)
      if (schedules.length > 0) {
        const schedule = schedules[0];
        //console.log('S1', schedule);
        const openTime = moment(schedule.openAllDay ? '00:00:00' : schedule.openTime, format).day(schedule.day - 1).subtract(timeOffset, 'm');
        const closeTime = openTime.clone().add(schedule.openAllDay ? 1440 : schedule.openDuration, 'm');
        //console.log('O', openTime, 'C', closeTime);
        if (now.isBetween(openTime, closeTime)) {
          //console.log('Between, close to ', closeTime);
          return closeTime;
        }
      }
      return null;
    }

  }

  async getMaintenanceStatus(deviceId) {
    const device = await this.getDeviceByDeviceId(deviceId);
    if (!device) {
      SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/maintenance-status] Unknown device (${deviceId}) requesting data, request has been denied.`, mposWebhookUrl);
      return { success: false, message: 'Invalid Device' };
    }
    try {
      const brand = await this.context.brand.getByBrandLocation(device.brandLocationId);
      const maintenanceStatus = await this.context.brandLocationMaintenance.getMaintenanceStatus(brand.id, device.brandLocationId);
      if (maintenanceStatus.status) {
        return { success: true, brandStatus: maintenanceStatus.brandStatus, countryStatus: maintenanceStatus.countryStatus };
      } else return { success: false };
    } catch (error) {
      return { success: false };
    }
  }

  async getMaintenanceUserStatus(deviceId) {
    const device = await this.getDeviceByDeviceId(deviceId);

    if (!device) {
      SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/maintenance-status] Unknown device (${deviceId}) requesting data, request has been denied.`, mposWebhookUrl);
      return { success: false, message: 'Invalid Device' };
    }
    try {
      const user = await this.context.brandLocationMaintenance.getUserByBrandLocationId(device.brandLocationId);
      if (user) {
        return { success: true, userStatus: true, user };
      } else {
        return { success: true, userStatus: false };
      }
    } catch (error) {
      return { success: false };
    }
  }

  async saveMaintenanceUser(deviceId, userInput) {
    const device = await this.getDeviceByDeviceId(deviceId);

    if (!device) {
      SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/create-maintenance-user] Unknown device (${deviceId}) requesting data, request has been denied.`, mposWebhookUrl);
      return { success: false, message: 'Invalid Device' };
    }
    userInput.brandLocationId = device.brandLocationId;
    try {
      const response = await this.context.brandLocationMaintenance.checkAndSaveMaintenanceUser(userInput);
      if (response.status) {
        return { success: true, user: response.user };
      }
      return { success: false, error: response.error };
    } catch (error) {
      return { success: false };
    }
  }

  async getAssessmentList(deviceId) {
    const device = await this.getDeviceByDeviceId(deviceId);

    if (!device) {
      SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/get-assessment-list] Unknown device (${deviceId}) requesting data, request has been denied.`, mposWebhookUrl);
      return { success: false, message: 'Invalid Device' };
    }
    try {
      const response = await this.context.brandLocationMaintenance.getAssessmentListByBrandLocationId(device.brandLocationId);
      if (response.status) {
        return { success: true, assessmentList: response.assessmentList, availableSubServiceList: response.availableSubServiceList };
      }
      return { success: false, error: response.error };
    } catch (error) {
      return { success: false };
    }
  }

  async saveMaintenanceAssessment(deviceId, assessmentInput) {
    const device = await this.getDeviceByDeviceId(deviceId);

    if (!device) {
      SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/create-assessment] Unknown device (${deviceId}) requesting data, request has been denied.`, mposWebhookUrl);
      return { success: false, message: 'Invalid Device' };
    }
    assessmentInput.brandLocationId = device.brandLocationId;
    try {
      const response = await this.context.brandLocationMaintenance.checkAndSaveAssessment(assessmentInput);
      if (response.status) {
        return { success: true, assessmentId: response.assessmentId, assessmentCode: response.assessmentCode };
      }
      return { success: false, error: response.error };
    } catch (error) {
      return { success: false };
    }
  }

  async getTicketList(deviceId) {
    const device = await this.getDeviceByDeviceId(deviceId);

    if (!device) {
      SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/get-assessment-list] Unknown device (${deviceId}) requesting data, request has been denied.`, mposWebhookUrl);
      return { success: false, message: 'Invalid Device' };
    }
    try {
      const response = await this.context.brandLocationMaintenance.getTicketList({ brandLocationId: device.brandLocationId });
      if (response.status) {
        return { success: true, ticketList: response.ticketList };
      }
      return { success: false, error: response.error };
    } catch (error) {
      return { success: false };
    }
  }

  async saveMaintenanceTicket(deviceId, ticketInput) {
    const device = await this.getDeviceByDeviceId(deviceId);

    if (!device) {
      SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/create-ticket] Unknown device (${deviceId}) requesting data, request has been denied.`, mposWebhookUrl);
      return { success: false, message: 'Invalid Device' };
    }
    ticketInput.brandLocationId = device.brandLocationId;
    try {
      const response = await this.context.brandLocationMaintenance.checkAndSaveTicket(ticketInput);
      if (response.status) {
        return { success: true, ticketId: response.ticketId, assessmentCode: response.assessmentCode };
      }
      return { success: false, error: response.error };
    } catch (error) {
      return { success: false };
    }
  }

  async getAreaList(deviceId) {
    const device = await this.getDeviceByDeviceId(deviceId);

    if (!device) {
      SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/get-assessment-list] Unknown device (${deviceId}) requesting data, request has been denied.`, mposWebhookUrl);
      return { success: false, message: 'Invalid Device' };
    }
    try {
      const areaList = await this.context.brandLocationMaintenance.getAreaList();
      if (Array.isArray(areaList)) {
        return {
          success: true,
          areaList: transformToCamelCase(areaList)
        };
      } else return {
        success: false,
      };
    } catch (error) {
      return { success: false };
    }
  }

  async getSubServiceList(deviceId) {
    const device = await this.getDeviceByDeviceId(deviceId);

    if (!device) {
      SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/get-assessment-list] Unknown device (${deviceId}) requesting data, request has been denied.`, mposWebhookUrl);
      return { success: false, message: 'Invalid Device' };
    }
    try {
      const response = await this.context.brandLocationMaintenance.getAvailableSubServicesByBrandLocationId(device.brandLocationId);
      if (response.status) {
        return { success: true, availableSubServiceList: response.availableSubServiceList };
      }
      return { success: false, error: response.error };
    } catch (error) {
      return { success: false };
    }
  }

  async getBranchAvailabilityNew(deviceId) {
    const device = await this.roDb(this.tableName)
      .select('*')
      .where('device_id', deviceId)
      .andWhere('status', mposDeviceStatus.PAIRED)
      .then(first);

    if (!device) {
      return { success: false, message: 'Invalid Device' };
    }
    const { acceptingOrders } = await this.roDb('brand_locations').select('accepting_orders').where('id', device.brandLocationId).then(first);
    if (!acceptingOrders) return { success: true, storeStatus: 'NOT_ACCEPTING_ORDER' };
    const fulfillmentsStatus = await this.context.brandLocation.getNewStoreFulfillmentStatusById(device.brandLocationId);
    let isAcceptingOrder = false;
    let isBusy = false;
    const busyStatusByFulfillmentType = {
      pickup: {
        isBusy: false,
        busyTime: null,
      },
      car: {
        isBusy: false,
        busyTime: null,
      },
      delivery: {
        isBusy: false,
        busyTime: null,
      },
      expressDelivery: {
        isBusy: false,
        busyTime: null,
      },
    };
    if (
      fulfillmentsStatus.pickup.storeStatus === brandLocationStoreStatus.STORE_OPEN ||
      fulfillmentsStatus.pickup.storeStatus === brandLocationStoreStatus.STORE_CLOSING_SOON
    ) {
      isAcceptingOrder = true;
    } else if (fulfillmentsStatus.pickup.isBusy) {
      isBusy = true;
      busyStatusByFulfillmentType.pickup = {
        isBusy: true,
        busyTime: fulfillmentsStatus.pickup.busyTime
      };
    }
    if (
      fulfillmentsStatus.car.storeStatus === brandLocationStoreStatus.STORE_OPEN ||
      fulfillmentsStatus.car.storeStatus === brandLocationStoreStatus.STORE_CLOSING_SOON
    ) {
      isAcceptingOrder = true;
    } else if (fulfillmentsStatus.car.isBusy) {
      isBusy = true;
      busyStatusByFulfillmentType.car = {
        isBusy: true,
        busyTime: fulfillmentsStatus.car.busyTime
      };
    }
    if (
      fulfillmentsStatus.delivery.storeStatus === brandLocationStoreStatus.STORE_OPEN ||
      fulfillmentsStatus.delivery.storeStatus === brandLocationStoreStatus.STORE_CLOSING_SOON
    ) {
      isAcceptingOrder = true;
    } else if (fulfillmentsStatus.delivery.isBusy) {
      isBusy = true;
      busyStatusByFulfillmentType.delivery = {
        isBusy: true,
        busyTime: fulfillmentsStatus.delivery.busyTime
      };
    }
    if (
      fulfillmentsStatus.expressDelivery.storeStatus === brandLocationStoreStatus.STORE_OPEN ||
      fulfillmentsStatus.expressDelivery.storeStatus === brandLocationStoreStatus.STORE_CLOSING_SOON
    ) {
      isAcceptingOrder = true;
    } else if (fulfillmentsStatus.expressDelivery.isBusy) {
      isBusy = true;
      busyStatusByFulfillmentType.expressDelivery = {
        isBusy: true,
        busyTime: fulfillmentsStatus.expressDelivery.busyTime
      };
    }
    return { success: true, storeStatus: isBusy ? 'BUSY' : (isAcceptingOrder ? 'ACCEPTING_ORDER' : 'NOT_ACCEPTING_ORDER'), busyStatusByFulfillmentType };
  }

  async updateBusyBranchAvailability(deviceId, offlineTime, selectedFulfillments, reason) {
    const device = await this.roDb(this.tableName)
      .select('*')
      .where('device_id', deviceId)
      .andWhere('status', mposDeviceStatus.PAIRED)
      .then(first);

    if (!device) {
      SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/v2/update-branch-availability] Unknown device (${deviceId}) requesting data, request has been denied.`, mposWebhookUrl);
      return { success: false, message: 'Invalid Device' };
    }
    try {
      const availability = {
        'busyReason': reason,
        'busyType': offlineTime,
        'pickup': selectedFulfillments.includes('PICKUP') || selectedFulfillments.includes('ALL'),
        'car': selectedFulfillments.includes('CAR') || selectedFulfillments.includes('ALL'),
        'delivery': selectedFulfillments.includes('DELIVERY') || selectedFulfillments.includes('ALL'),
        'expressDelivery': selectedFulfillments.includes('EXPRESS_DELIVERY') || selectedFulfillments.includes('ALL')
      };
      const { errors } = await this.context.brandLocationAvailability.addAvailability(device.brandLocationId, availability);
      if (errors) {
        SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/v2/update-branch-availability] Something went wrong for device (${deviceId})`, mposWebhookUrl);
        return { success: false, message: 'Something went wrong', errors };
      }
      await this.context.brandLocation.updateBranchAvailabilityStatusInRedis(device.brandLocationId);
      return { success: true, message: 'Branch Availability Updated' };
    } catch (error) {
      SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/v2/update-branch-availability] Something went wrong for device (${deviceId})`, mposWebhookUrl);
      return { success: false, message: 'Something went wrong', error };
    }
  }

  async updateAcceptingOrderBranchAvailability(deviceId, acceptingOrder, reason) {
    const device = await this.roDb(this.tableName)
      .select('*')
      .where('device_id', deviceId)
      .andWhere('status', mposDeviceStatus.PAIRED)
      .then(first);

    if (!device) {
      SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/v2/update-branch-availability] Unknown device (${deviceId}) requesting data, request has been denied.`, mposWebhookUrl);
      return { success: false, message: 'Invalid Device' };
    }
    try {
      const { errors } = await this.context.brandLocation.setBrandLocationAcceptingOrders(device.brandLocationId, acceptingOrder, acceptingOrder ? null : reason);
      if (errors) {
        SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/v2/update-branch-availability] Something went wrong for device (${deviceId})`, mposWebhookUrl);
        return { success: false, message: 'Something went wrong', errors };
      }
      return { success: true, message: 'Branch Availability Updated' };
    } catch (error) {
      SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/v2/update-branch-availability] Something went wrong for device (${deviceId})`, mposWebhookUrl);
      return { success: false, message: 'Something went wrong', error };
    }
  }

  async updateWeeklySchedule(deviceId, schedules) {
    const device = await this.roDb(this.tableName)
      .select('*')
      .where('device_id', deviceId)
      .andWhere('status', mposDeviceStatus.PAIRED)
      .then(first);

    if (!device) {
      SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/v2/update-weekly-schedule] Unknown device (${deviceId}) requesting data, request has been denied.`, mposWebhookUrl);
      return { success: false, message: 'Invalid Device' };
    }
    try {
      let selectedFulfillments = [];
      schedules.map(schedule => {
        if (schedule.pickupOpenAllDay || schedule.pickupScheduleInfo) selectedFulfillments.push('PICKUP');
        if (schedule.carOpenAllDay || schedule.carScheduleInfo) selectedFulfillments.push('CAR');
        if (schedule.deliveryOpenAllDay || schedule.deliveryScheduleInfo) selectedFulfillments.push('DELIVERY');
        if (schedule.expressDeliveryOpenAllDay || schedule.expressDeliveryScheduleInfo) selectedFulfillments.push('EXPRESS_DELIVERY');
      });
      selectedFulfillments = [...new Set(selectedFulfillments)];
      const { errors, schedules: formattedSchedules } = await this.context.brandLocationWeeklySchedule.validateAndFormatted(device.brandLocationId, schedules, selectedFulfillments);
      if (errors.length > 0) {
        SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/V2/update-weekly-schedule] Something went wrong for device (${deviceId})`, mposWebhookUrl);
        return { success: false, message: 'Something went wrong', errors };
      }

      const result = await this.context.withTransaction(
        'brandLocationWeeklySchedule',
        'save',
        device.brandLocationId,
        formattedSchedules,
        selectedFulfillments
      );
      if (result.error) {
        SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/V2/update-weekly-schedule] Something went wrong for device (${deviceId})`, mposWebhookUrl);
        return { success: false, message: 'Something went wrong', error: result.error };
      }
      return { success: true, message: 'Branch Weekly Schedule Updated' };
    } catch (error) {
      SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/V2/update-weekly-schedule] Something went wrong for device (${deviceId})`, mposWebhookUrl);
      return { success: false, message: 'Something went wrong', error };
    }
  }

  async addScheduleException(deviceId, exception) {
    const device = await this.roDb(this.tableName)
      .select('*')
      .where('device_id', deviceId)
      .andWhere('status', mposDeviceStatus.PAIRED)
      .then(first);

    if (!device) {
      SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/v2/add-schedule-exception] Unknown device (${deviceId}) requesting data, request has been denied.`, mposWebhookUrl);
      return { success: false, message: 'Invalid Device' };
    }
    try {
      const { errors, exception: exceptionWithZone } = await this.context.brandLocationScheduleException.validateNewException(device.brandLocationId, exception);
      if (errors.length > 0) {
        SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/V2/add-schedule-exception] Something went wrong for device (${deviceId})`, mposWebhookUrl);
        return { success: false, message: 'Something went wrong', errors };
      }
      const id = await this.context.brandLocationScheduleException.save(device.brandLocationId, exceptionWithZone);
      return { success: true, message: 'Branch Schedule Exception added', scheduleId: id };
    } catch (error) {
      SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/V2/add-schedule-exception] Something went wrong for device (${deviceId})`, mposWebhookUrl);
      return { success: false, message: 'Something went wrong', error };
    }
  }

  async deleteScheduleException(deviceId, exceptionId) {
    const device = await this.roDb(this.tableName)
      .select('*')
      .where('device_id', deviceId)
      .andWhere('status', mposDeviceStatus.PAIRED)
      .then(first);

    if (!device) {
      SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/v2/delete-schedule-exception] Unknown device (${deviceId}) requesting data, request has been denied.`, mposWebhookUrl);
      return { success: false, message: 'Invalid Device' };
    }
    try {
      const errors = await this.context.brandLocationScheduleException.validateRemoveException(device.brandLocationId, exceptionId);
      if (errors.length > 0) {
        SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/V2/delete-schedule-exception] Something went wrong for device (${deviceId})`, mposWebhookUrl);
        return { success: false, message: 'Something went wrong', errors };
      }
      const isUpdated = await this.context.brandLocationScheduleException.removeException(exceptionId);
      if (isUpdated) return { success: true, message: 'Branch Schedule Exception removed', exceptionId };
      return { success: false, message: 'Branch Schedule Exception can not removed', exceptionId };
    } catch (error) {
      SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/V2/delete-schedule-exception] Something went wrong for device (${deviceId})`, mposWebhookUrl);
      return { success: false, message: 'Something went wrong', error };
    }
  }

  async getScheduleExceptions(deviceId) {
    const device = await this.roDb(this.tableName)
      .select('*')
      .where('device_id', deviceId)
      .andWhere('status', mposDeviceStatus.PAIRED)
      .then(first);

    if (!device) {
      SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/v2/get-schedule-exceptions] Unknown device (${deviceId}) requesting data, request has been denied.`, mposWebhookUrl);
      return { success: false, message: 'Invalid Device' };
    }
    try {
      const exceptions = await this.context.brandLocationScheduleException.getByBrandLocationId(device.brandLocationId);
      return { success: false, message: 'Branch Schedule Exceptions', exceptions };
    } catch (error) {
      SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/V2/get-schedule-exceptions] Something went wrong for device (${deviceId})`, mposWebhookUrl);
      return { success: false, message: 'Something went wrong', error };
    }
  }

  async getBranchDetailNew(deviceId) {
    const device = await this.roDb(this.tableName)
      .select('*')
      .where('device_id', deviceId)
      .andWhere('status', mposDeviceStatus.PAIRED)
      .then(first);

    if (!device) {
      SlackWebHookManager.sendTextToSlack(`[INFO] [${env}] [/branch-status] Unknown device (${deviceId}) requesting data, request has been denied.`, mposWebhookUrl);
      return { success: false, message: 'Invalid Device' };
    }

    const select = `bl.id as brand_location_id, bl.name as brand_location_name, bl.name_ar as brand_location_name_ar, bl.name_tr as brand_location_name_tr,
      b.name as brand_name, b.name_ar as brand_name_ar, b.name_tr as brand_name_tr, b.id as brand_id, bl.accepting_orders,
      bl.has_pickup, bl.allow_deliver_to_car, bl.has_delivery, bl.allow_express_delivery`;
    let branch = await this.roDb('brand_locations as bl')
      .select(this.db.raw(select))
      .leftJoin('brands AS b', 'b.id', 'bl.brand_id')
      .where('bl.id', device.brandLocationId)
      .then(first);

    if (!branch) {
      SlackWebHookManager.sendTextToSlack(`[ERROR] [${env}] [/branch-status] Unknown order (${device.brandLocationId}) for the device (${deviceId}), request has been denied.`, mposWebhookUrl);
      return { success: false, message: 'Branch can not found!' };
    }
    const closeAllDay = { closeAllDay: true };
    const weeklySchedules = await this.context.brandLocationWeeklySchedule.getByBrandLocationId(device.brandLocationId);
    const schedules = [];
    for (let i = 0; i < 7; i++) {
      let obj = { day: i };
      const schedule = weeklySchedules.find(schedule => schedule.day === i);
      if (schedule) {
        const serviceTime = { openTime: '00:00:00', openDuration: 1440, openAllDay: true };
        if (branch.hasPickup) {
          obj = {
            ...obj, 'pickup': schedule.pickupOpenAllDay
              ? serviceTime :
              (schedule.pickupScheduleInfo ?
                schedule.pickupScheduleInfo
                : closeAllDay)
          };
        }
        if (branch.allowDeliverToCar) {
          obj = {
            ...obj, 'car': schedule.carOpenAllDay
              ? serviceTime :
              (schedule.carScheduleInfo ?
                schedule.carScheduleInfo
                : closeAllDay)
          };
        }
        if (branch.hasDelivery) {
          obj = {
            ...obj, 'delivery': schedule.deliveryOpenAllDay
              ? serviceTime :
              (schedule.deliveryScheduleInfo ?
                schedule.deliveryScheduleInfo
                : closeAllDay)
          };
        }
        if (branch.allowExpressDelivery) {
          obj = {
            ...obj, 'expressDelivery': schedule.expressDeliveryOpenAllDay
              ? serviceTime :
              (schedule.expressDeliveryScheduleInfo ?
                schedule.expressDeliveryScheduleInfo
                : closeAllDay)
          };
        }
      } else {
        if (branch.hasPickup) obj = { ...obj, 'pickup': closeAllDay };
        if (branch.allowDeliverToCar) obj = { ...obj, 'car': closeAllDay };
        if (branch.hasDelivery) obj = { ...obj, 'delivery': closeAllDay };
        if (branch.allowExpressDelivery) obj = { ...obj, 'expressDelivery': closeAllDay };
      }
      schedules.push(obj);
    }

    branch.schedules = schedules;
    branch.deviceCode = device.code;
    branch = omit(branch, ['hasPickup', 'allowDeliverToCar', 'hasDelivery', 'allowExpressDelivery']);
    return { success: true, branch };
  }
}

module.exports = BrandLocationDevice;
