const { first, pick, assign, omit, map, uniq } = require('lodash');
const moment = require('moment');
const Promise = require('bluebird');
const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');
const { notificationsForStatusChange } = require('./notifications');
// eslint-disable-next-line no-unused-vars
const { publishVerifiedEmailToBraze } = require('../../lib/braze');
// eslint-disable-next-line no-unused-vars
const { mapPaymentMethod, isNullOrUndefined, publishArrivedOrderSubscriptionEvent } = require('../../lib/util');
const SlackWebHookManager = require('../slack-webhook-manager/slack-webhook-manager');
const sqs = require('./../../lib/sqs-base')('delivery');
const axios = require('axios');
const firebase = require('../../lib/firebase');
const sqsCofeToTalabat = require('./../../lib/sqs-base')('to_talabat');
const sqsCofeToBarq = require('./../../lib/sqs-base')('to_barq');
const isUUID = require('is-uuid');
const { v4: UUIDv4 } = require('uuid');
const uuid = { get: UUIDv4, validate: isUUID.v4 };
const {
  orderSetError, arrivedOrderSubscriptionEvent, paymentStatusOrderType
} = require('../root/enums');
const { kinesisEventTypes } = require('../../lib/aws-kinesis-logging');
const { notificationType } = require('../root/enums');
const {
  orderSetStatusNames,
  orderSetStatusError,
  orderTypes,
  fulfillmentType,
  addressFieldType,
  deliveryPartners,
  countryConfigurationKeys,
  orderSetStatusPlatforms
} = require('../../schema/root/enums');
const {
  // isDev,
  delivery: { deliveryServiceUrl, deliveryServiceToken },
  defaultBrandLocationContacts,
  bulkOrderSetStatusUpdateLimit,
  enableFoodicsIntegration
} = require('../../../config');
const {
  sendCustomerEvent
} = require('../../lib/customer-analytics');
const {
  customerAnalyticsEvents,
} = require('../root/enums');
const { publishEvent } = require('../../lib/event-publisher');
const { EventType } = require('../../lib/event-publisher/enums');
const foodicsOrderQueue = require('../../lib/sqs-base')('foodics_order_queue');
const { orderFulfillmentTypes } = require('../order-set/enums');

class OrderSetStatus extends BaseModel {
  constructor(db, context) {
    super(db, 'order_set_statuses', context);
    this.loaders = createLoaders(this);
  }

  getAllByOrderSet(orderSetId) {
    this.loaders.statusHistory.clear(orderSetId);
    return this.loaders.statusHistory.load(orderSetId);
  }

  getLatestByOrderSet(orderSetId) {
    return this.getAllByOrderSet(orderSetId).then(first);
  }

  async setStatusForOrderSetId(orderSetId, status, context) {
    const latestStatus = await this.getLatestByOrderSet(orderSetId);
    if ((latestStatus && latestStatus.status !== status) || !latestStatus) {
      let id = await this.save({
        orderSetId,
        status,
        createdAt: moment().toISOString(),
      }, context);
      await context.kinesisLogger.sendLogEvent(
        {
          orderSetId,
          currentStatus: latestStatus,
          targetStatus: status,
        },
        kinesisEventTypes.orderStatusChange
      );
      const orderSet = await context.orderSet.getById(orderSetId);
      const customerDefaultDevice = await context.deviceMetadata.getDefaultByCustomer(
        orderSet.customerId
      );
      if (status === orderSetStatusNames.PLACED) {
        await context.orderSet.incrementCouponCountersForOrderSet(
          orderSetId,
          1
        );

        orderSet.items = await context.orderItem.getByOrderSetId(orderSetId);
        // console.log('order set  event data', orderSet);

        const brandLocation = await context.brandLocation.getById(
          orderSet.brandLocationId
        );
        // console.log('order set event brandlocation data', brandLocation);

        const city = await context.city.getById(brandLocation.cityId);
        // console.log('order set event city data', city);

        publishVerifiedEmailToBraze(
          {
            customerId: orderSet.customerId,
            // eslint-disable-next-line camelcase
            home_city: city.name,
          },
          null
        );

        publishEvent(
          EventType.ORDER_PLACED,
          {
            orderType: paymentStatusOrderType.ORDER_SET,
            referenceOrderId: orderSetId,
          },
        ).catch(err => console.error(err));

        // TOTAL_ORDER_PLACED **********/
        sendCustomerEvent(
          orderSet.customerId,
          customerDefaultDevice,
          customerAnalyticsEvents.TOTAL_ORDER_PLACED,
          orderSet.items.length,
        );
        /*******************************/

        // FIRST_ORDER_PLACED **********/
        const [{ count }] = await context.db(context.orderSet.tableName)
          .where('customer_id', orderSet.customerId)
          .count();

        if (Number(count) === 1) {
          sendCustomerEvent(
            orderSet.customerId,
            customerDefaultDevice,
            customerAnalyticsEvents.FIRST_ORDER_PLACED,
            orderSet.items.length,
          );
        }
        /*******************************/

        await context.customer.markIfReferralRewardAvailed(orderSet);

        if (enableFoodicsIntegration) {
          const foodicsBrand = await context.brand.getByBrandLocation(orderSet.brandLocationId);

          if (foodicsBrand.enableFoodics) {
            await foodicsOrderQueue.sendMessage({
              orderSetId
            }, 2);
          }
        }
      }
      if (status === orderSetStatusNames.REJECTED) {
        await context.orderSet.incrementCouponCountersForOrderSet(
          orderSetId,
          -1
        );
      }
      if (status === orderSetStatusNames.COMPLETED) {
        // Add reward point if order is in a reward system
        orderSet.items = await context.orderItem.getByOrderSetId(orderSetId);

        await context.rewardPointsTransaction.addPointsForOrderSet(orderSet);

        await context.referral.rewardReferralSender({ orderSetId });

        await context.stampRewardCustomer.checkAndUpdateCustomerStampReward(orderSet.customerId, orderSetId, 'PORTAL');
        // await context.customer.markIfReferralRewardAvailed(orderSet);
        const brandLocation = await context.brandLocation.getById(
          orderSet.brandLocationId
        );
        /*
        console.log(
          'order completed braze event brandLocation data',
          brandLocation
        );
         */

        const subscriptionInfo = orderSet.prePaid?.subscription;
        if (subscriptionInfo) {
          const subscriptionIds = map(subscriptionInfo, subs => subs.id);
          if (subscriptionIds && subscriptionIds.length > 0) {
            for (const subscriptionId of subscriptionIds) {
              await context.cSubscriptionCustomerTransaction
                .finishSubscriptionIfNoUsageRemaining({
                  customerId: orderSet.customerId,
                  subscriptionId,
                });
            }
          }
        }
        /*const subscriptionId = orderSet.prePaid?.subscription?.id;
        if (subscriptionId) {
          await context.cSubscriptionCustomerTransaction
            .finishSubscriptionIfNoUsageRemaining({
              customerId: orderSet.customerId,
              subscriptionId,
            });
        }*/

        const brand = await context.brand.getById(brandLocation.brandId);
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
        await context.customer.getFavoriteBrandLast30Days(orderSet.customerId);
        await context.customer.sendPurchaseEvent(
          orderSet,
          orderSet.items,
          brand
        );

        const arrivedTime = await context.arrivingTime.getByOrderSetId(orderSetId);
        if (arrivedTime) {
          const order = {
            brandLocationId: brandLocation.id,
            orderSetId
          };
          await publishArrivedOrderSubscriptionEvent(
            this.context,
            order,
            arrivedOrderSubscriptionEvent.COMPLETED_ORDER_FOR_VENDOR
          );
        }

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
        const [{ count }] = await context.db(context.orderSet.tableName)
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
        /*******************************/
      }
      if (status === orderSetStatusNames.ACCEPTED) {
        await this.activateDeliveryOnAccepted(orderSetId, context);
        const orderFulfillment = await context.orderFulfillment.getByOrderSet(orderSet.id);
        if (orderFulfillment && orderFulfillment.type === orderTypes.EXPRESS_DELIVERY) {
          id = await this.save({
            orderSetId,
            status: orderSetStatusNames.PREPARING,
            createdAt: moment().toISOString(),
            clientName: orderSetStatusPlatforms.AUTOMATICALLY,
          }, context);
        }
        await this.context.driver.sendSMSToDriver(orderSetId);
        const arrivingInfo = await this.context.arrivingTime.getByOrderSetId(orderSetId);
        const anHourAgo = moment().subtract(60, 'm');
        if (arrivingInfo && anHourAgo.isSameOrBefore(moment(arrivingInfo.arrivalTime)) &&
          (arrivingInfo.arrived || (!arrivingInfo.arrived && moment(arrivingInfo.arrivalTime).isSameOrBefore(moment())))
        ) {
          const order = {
            brandLocationId: orderSet.brandLocationId,
            orderSetId,
            fulfillmentType: arrivingInfo.fulfillmentType,
            shortCode: orderSet.shortCode,
            arrivalTime: arrivingInfo.arrivalTime,
          };
          await publishArrivedOrderSubscriptionEvent(
            this.context,
            order,
            arrivedOrderSubscriptionEvent.ARRIVED_ORDER_FOR_VENDOR
          );
        }
      }
      const notifs = await notificationsForStatusChange(
        orderSetId,
        status,
        context
      );
      await context.notification.createAllIn(notifs);
      return id;
    }
    await context.kinesisLogger.sendLogEvent(
      {
        orderSetId,
        currentStatus: latestStatus,
        targetStatus: status,
      },
      kinesisEventTypes.orderStatusChangeSameStatus
    );

    return latestStatus.id;
  }

  // eslint-disable-next-line complexity
  async activateDeliveryOnAccepted(orderSetId, context) {
    // start
    console.log('trigger aws sqs for delivery order');
    const orderSet = await context.orderSet.getById(orderSetId);
    // allow for test flights only
    // if (
    //   (orderSet &&
    //     orderSet.srcPlatformVersion &&
    //     (orderSet.srcPlatformVersion.indexOf('5.7.3') !== -1 ||
    //       orderSet.srcPlatformVersion.indexOf('56702') !== -1)) ||
    //   [
    //     'VzHVNYli5BcVY0Q1qbnIoifrR013',
    //     'TAOAmoZtxhgeqW7C0jlNuvZ6uqC3',
    //     '8kdaVe4B29QB4R4M2S5HSuFu0T72',
    //     '9a3p0vaxX5gmVJzmS59AEnRUNGB2',
    //     'WLnY6nbUsLVc80g4BiZ9pfiohF23',
    //   ].indexOf(orderSet.customerId) !== -1 ||
    //   isDev
    // ) {
    // trigger aws sqs for delivery order
    const orderFulfillment = await context.orderFulfillment.getByOrderSet(
      orderSet.id
    );
    if (orderFulfillment && orderFulfillment.type === orderTypes.DELIVERY) {
      const customer = await context.customer.getById(orderSet.customerId);
      let brandLocationAddress = await this.context.brandLocationAddress.getFullByBrandLocation(
        orderSet.brandLocationId
      );
      const brandLocation = await context.brandLocation.getById(
        orderSet.brandLocationId
      );
      const brand = await context.brand.getById(brandLocation.brandId);
      const country = await context.country.getById(brand.countryId);
      const deliveryConfiguration = await context.countryConfiguration.getByKey(
        countryConfigurationKeys.AUTOMATIC_DELIVERY_INTEGRATION,
        brand.countryId
      );
      // TODO: we will configure country-configuration with FE.
      if (
        deliveryConfiguration &&
        deliveryConfiguration.configurationValue === 'true' &&
        brandLocation.isAutomaticDeliveryIntegrationActive
      ) {
        try {
          const deliveryPartnerConfiguration = await context.countryConfiguration.getByKey(
            countryConfigurationKeys.DELIVERY_PARTNER,
            brand.countryId
          );
          const deliveryPartner = deliveryPartnerConfiguration.configurationValue;

          console.log('should trigger aws sqs');
          const fullDeliveryAddress = await context.deliveryAddress.getAddrByOrderFulfillmentId(
            orderFulfillment.id,
            country.isoCode
          );
          const omittedFields = [
            'id',
            'orderFulfillmentId',
            'geolocation',
            'avenue',
            'neighborhoodName',
            'streetNumber',
            'airportName',
            'terminalNumber',
            'gateNumber',
            'neighborhoodId',
            'cityold',
            'dynamicData',
          ];
          if (!fullDeliveryAddress.city) {
            fullDeliveryAddress.city = fullDeliveryAddress.cityold;
          }
          if (
            deliveryPartner === deliveryPartners.CAREEM ||
            deliveryPartner === deliveryPartners.MASHKOR
          ) {
            fullDeliveryAddress.unitNumber = fullDeliveryAddress.dynamicData[
              addressFieldType.UNIT_NUMBER
            ]
              ? fullDeliveryAddress.dynamicData[addressFieldType.UNIT_NUMBER]
              : fullDeliveryAddress.unitNumber;
            fullDeliveryAddress.floor = fullDeliveryAddress.dynamicData[
              addressFieldType.FLOOR
            ]
              ? fullDeliveryAddress.dynamicData[addressFieldType.FLOOR]
              : fullDeliveryAddress.floor;
            fullDeliveryAddress.buildingName = fullDeliveryAddress.dynamicData[
              addressFieldType.BUILDING_NAME
            ]
              ? fullDeliveryAddress.dynamicData[addressFieldType.BUILDING_NAME]
              : fullDeliveryAddress.buildingName;
            fullDeliveryAddress.block = fullDeliveryAddress.dynamicData[
              addressFieldType.BLOCK
            ]
              ? fullDeliveryAddress.dynamicData[addressFieldType.BLOCK]
              : fullDeliveryAddress.block;
            fullDeliveryAddress.area =
              fullDeliveryAddress.dynamicData[addressFieldType.AREA];
            fullDeliveryAddress.street = fullDeliveryAddress.dynamicData[
              addressFieldType.STREET
            ]
              ? fullDeliveryAddress.dynamicData[addressFieldType.STREET]
              : fullDeliveryAddress.street;
            fullDeliveryAddress.landmark =
              fullDeliveryAddress.dynamicData[addressFieldType.LANDMARK];
            fullDeliveryAddress.avenue =
              fullDeliveryAddress.dynamicData[addressFieldType.AVENUE];
            if (fullDeliveryAddress.avenue && !fullDeliveryAddress.area) {
              fullDeliveryAddress.area = fullDeliveryAddress.avenue;
            }
          }
          fullDeliveryAddress.line1 = Object.keys(fullDeliveryAddress.dynamicData)
            .map(function (k) {
              return fullDeliveryAddress.dynamicData[k];
            })
            .filter(function (k) {
              return k !== '' && k !== null && k !== undefined;
            })
            .join(', ');
          fullDeliveryAddress.line1 =
            (fullDeliveryAddress && fullDeliveryAddress.neighborhood
              ? fullDeliveryAddress.neighborhood + ', '
              : '') + fullDeliveryAddress.line1;
          if (deliveryPartner === deliveryPartners.JEEBLY) {
            omittedFields.concat([
              'unitNumber',
              'floor',
              'buildingName',
              'area',
              'street',
            ]);
          }
          const deliveryAddress = omit(fullDeliveryAddress, omittedFields);
          //If branch name and brand name object return localizated, choosing english name
          //Otherwise choosing name object from DB
          brandLocationAddress.branchName = brandLocation.name.en || brandLocation.name;
          brandLocationAddress.brandName = brand.name.en || brand.name;
          brandLocationAddress = omit(brandLocationAddress, [
            'brandLocationId',
            'geolocation',
            'neighborhoodId',
            'shortAddressAr',
            'shortAddressTr',
            'cityId',
          ]);

          if (deliveryPartner === deliveryPartners.TALABAT ||
            deliveryPartner === deliveryPartners.BARQ) {
            let { contact } = brandLocation;

            let setDefaultContact = false;

            if (contact.length === 0) setDefaultContact = true;

            if (contact.length > 0) {
              const findPrimaryIndex = contact.findIndex(x => x.isPrimary === true);

              if (findPrimaryIndex === -1) setDefaultContact = true;

              if (setDefaultContact === false) contact = contact[findPrimaryIndex].phone;
            }

            if (setDefaultContact) contact = defaultBrandLocationContacts[country.isoCode] || '+971045207023';

            brandLocation['phone'] = contact;

            const currency = await context.currency.getById(country.currencyId);

            const consumers = {
              TALABAT: sqsCofeToTalabat,
              BARQ: sqsCofeToBarq,
            };

            const sqsConsumer = consumers[deliveryPartner] || null;

            let customerName = `${customer.firstName} ${customer.lastName}`;

            customerName = customerName.trim();

            sqsConsumer.sendMessage({
              type: 'CREATE_NEW_ORDER',
              items: await this.context.orderItem.getByOrderSetId(orderSet.id),
              deliveryPartner,
              brandId: brand.id,
              orderId: orderSet.id,
              shortCode: orderSet.shortCode,
              customerId: orderSet.customerId,
              customer: {
                firstName: customer.firstName,
                lastName: customer.lastName,
                name: customerName,
                phoneNumber: customer.phoneNumber,
              },
              paid: orderSet.paid,
              brandLocationId: orderSet.brandLocationId,
              brandLocationPhone: brandLocation.phone,
              amountDue: orderSet.amountDue,
              total: orderSet.total,
              countryDialCode: country.dialCode,
              countryIsoCode: country.isoCode,
              cod: orderSet.cashOnDelivery,
              prepTime: 15,
              pickupLocation: brandLocationAddress,
              dropoffLocation: deliveryAddress,
              currencyCode: currency?.isoCode,
            });

            const pickupAddressLine1 = `${brandLocationAddress.street} ${brandLocationAddress.neighborhood} ${brandLocationAddress.city}`;

            const dt = moment().format('YYYY-MM-DD HH:mm:ss');

            await context.db.raw(`
            INSERT INTO delivery_orders
              (id,
                created_at,
                updated_at,
                amount_due,
                cod,
                customer_id,
                customer_name,
                customer_number,
                delivery_partner,
                dropoff_address_line1,
                order_id,
                paid,
                pickup_address_line1,
                total,
                country_dial_code,
                reference,
                partner_order_id,
                status)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,
                'pending-${deliveryPartner.toLowerCase()}-id',
                'PENDING')`, [
              uuid.get(),
              dt,
              dt,
              orderSet.amountDue,
              orderSet.cashOnDelivery,
              orderSet.customerId,
              `${customerName}`,
              customer.phoneNumber,
              deliveryPartner,
              deliveryAddress.line1,
              orderSet.id,
              orderSet.paid,
              pickupAddressLine1,
              orderSet.total,
              country.dialCode,
              orderSet.shortCode]);

            return;
          }

          await sqs.sendMessage({
            type: 'CREATE_NEW_ORDER',
            deliveryPartner,
            orderId: orderSet.id,
            shortCode: orderSet.shortCode,
            customerId: orderSet.customerId,
            customer: {
              name: (customer.firstName + ' ' + customer.lastName
                ? customer.lastName
                : ''
              ).trim(),
              phoneNumber: customer.phoneNumber,
            },
            paid: orderSet.paid,
            brandLocationId: orderSet.brandLocationId,
            brandLocationPhone: brandLocation.phone,
            amountDue: orderSet.amountDue,
            total: orderSet.total,
            countryDialCode: country.dialCode,
            countryIsoCode: country.isoCode,
            cod: orderSet.cashOnDelivery,
            prepTime: 15,
            pickupLocation: brandLocationAddress,
            dropoffLocation: deliveryAddress,
          });
        } catch (error) {
          await context.kinesisLogger.sendLogEvent(error, kinesisEventTypes.autoActivateDeliverySQSError);
          SlackWebHookManager.sendTextToSlack(`[ERROR] Can not send CREATE_NEW_ORDER request Delivery SQS for the order(${orderSetId}). Please check it.`);
        }
      }
    }
    // }
    // end
  }

  async validate({ orderSetId, status }) {
    const errors = [];
    const { status: lastStatus } = await this.getLatestByOrderSet(orderSetId);
    if (lastStatus === status) {
      errors.push(orderSetStatusError.STATUS_HAS_BEEN_ALREADY_CHANGED);
      return errors;
    }
    const orderFulfillment = await this.context.orderFulfillment.getByOrderSet(orderSetId);
    switch (status) {
      case orderSetStatusNames.PLACED:
        if (![orderSetStatusNames.INITIATED].includes(lastStatus)) {
          errors.push(orderSetStatusError.UNEXPECTED_REQUESTED_STATUS);
        }
        break;
      case orderSetStatusNames.ACCEPTED:
        if (![orderSetStatusNames.PLACED, orderSetStatusNames.REPORTED].includes(lastStatus)) {
          errors.push(orderSetStatusError.UNEXPECTED_REQUESTED_STATUS);
        }
        break;
      case orderSetStatusNames.PREPARING:
        if (![orderSetStatusNames.ACCEPTED, orderSetStatusNames.REPORTED].includes(lastStatus)) {
          errors.push(orderSetStatusError.UNEXPECTED_REQUESTED_STATUS);
        }
        break;
      case orderSetStatusNames.PREPARED:
        if (orderFulfillment.type === orderTypes.EXPRESS_DELIVERY) {
          errors.push(orderSetStatusError.UNEXPECTED_REQUESTED_STATUS);
        } else if (![orderSetStatusNames.PREPARING, orderSetStatusNames.REPORTED].includes(lastStatus)) {
          errors.push(orderSetStatusError.UNEXPECTED_REQUESTED_STATUS);
        }
        break;
      case orderSetStatusNames.READY_FOR_PICKUP:
        if ([orderTypes.EXPRESS_DELIVERY, orderTypes.DELIVERY].includes(orderFulfillment.type) || ![orderSetStatusNames.PREPARING, orderSetStatusNames.PREPARED, orderSetStatusNames.REPORTED].includes(lastStatus)) {
          errors.push(orderSetStatusError.UNEXPECTED_REQUESTED_STATUS);
        }
        break;
      case orderSetStatusNames.WAITING_FOR_COURIER:
        if (orderFulfillment.type !== orderTypes.DELIVERY || ![orderSetStatusNames.PREPARING, orderSetStatusNames.PREPARED, orderSetStatusNames.REPORTED].includes(lastStatus)) {
          errors.push(orderSetStatusError.UNEXPECTED_REQUESTED_STATUS);
        }
        break;
      case orderSetStatusNames.OUT_FOR_DELIVERY:
        if (![orderTypes.EXPRESS_DELIVERY, orderTypes.DELIVERY].includes(orderFulfillment.type) || ![orderSetStatusNames.PREPARING, orderSetStatusNames.WAITING_FOR_COURIER, orderSetStatusNames.REPORTED].includes(lastStatus)) {
          errors.push(orderSetStatusError.UNEXPECTED_REQUESTED_STATUS);
        }
        break;
      case orderSetStatusNames.DELIVERY_DELAYED:
        if (orderFulfillment.type !== orderTypes.EXPRESS_DELIVERY || ![orderSetStatusNames.OUT_FOR_DELIVERY, orderSetStatusNames.REPORTED].includes(lastStatus)) {
          errors.push(orderSetStatusError.UNEXPECTED_REQUESTED_STATUS);
        }
        break;
      case orderSetStatusNames.DELIVERED:
        if (![orderTypes.EXPRESS_DELIVERY, orderTypes.DELIVERY ].includes(orderFulfillment.type) || ![orderSetStatusNames.OUT_FOR_DELIVERY, orderSetStatusNames.DELIVERY_DELAYED, orderSetStatusNames.REPORTED].includes(lastStatus)) {
          errors.push(orderSetStatusError.UNEXPECTED_REQUESTED_STATUS);
        } else if (orderTypes.EXPRESS_DELIVERY == orderFulfillment.type && orderFulfillment.driverId) {
          errors.push(orderSetStatusError.UNEXPECTED_REQUESTED_STATUS);
        }
        break;
      case orderSetStatusNames.COMPLETED:
        if (![orderSetStatusNames.READY_FOR_PICKUP, orderSetStatusNames.DELIVERED, orderSetStatusNames.REPORTED].includes(lastStatus)) {
          errors.push(orderSetStatusError.UNEXPECTED_REQUESTED_STATUS);
        }
        break;
      case orderSetStatusNames.REJECTED:
        if (![orderSetStatusNames.PLACED, orderSetStatusNames.REPORTED].includes(lastStatus)) {
          errors.push(orderSetStatusError.UNEXPECTED_REQUESTED_STATUS);
        }
        break;
      default:
        break;
    }
    if (status === orderSetStatusNames.COMPLETED) {
      const statusHistory = await this.context.paymentStatus.getAllByOrderSetId(
        orderSetId
      );

      const currentStatus = first(statusHistory);
      // console.log('currentStatus', currentStatus);
      if (currentStatus) {
        if (currentStatus.name !== 'PAYMENT_SUCCESS') {
          errors.push(orderSetStatusError.PAYMENT_DUE);
        }
      } else {
        errors.push(orderSetStatusError.PAYMENT_DUE);
      }
    }

    return errors;
  }

  async validateBulkOrderSet({orderSetIds, status}) {
    const errors = [];
    let updatedOrderSetList = [];
    const admin = await this.context.admin.getByAuthoId(this.context.auth.id);
    if (admin && !this.context.auth.isVendorAdmin) {
      const uniqOrderSetIds = uniq(orderSetIds);
      const validUuid = orderSetIds.every(id => uuid.validate(id));
      if (!validUuid) {
        errors.push(orderSetStatusError.INVALID_ORDER_SET_ID);
        return {errors};
      }
      if (uniqOrderSetIds.length > bulkOrderSetStatusUpdateLimit) {
        errors.push(orderSetStatusError.BULK_CHANGE_IS_LIMITED_TO_10_ORDERS);
        return {errors};
      }

      const select = 'os.id, of.type as fulfillment_type, os.current_status, os.payment_method';
      const orderSets = await this.context.db(`${this.context.orderSet.tableName} as os`)
        .select(this.context.db.raw(select))
        .leftJoin(`${this.context.orderFulfillment.tableName} as of`, 'of.order_set_id', 'os.id')
        .whereIn('os.id', uniqOrderSetIds);

      if (orderSets.length == 0 || uniqOrderSetIds.length != orderSets.length) {
        errors.push(orderSetStatusError.INVALID_ORDER_SET_ID);
      } else {
        let checkList = [orderSetStatusNames.REPORTED];
        let fulfillmentCheck = false;
        let acceptableFulfillments = [];
        switch (status) {
          case orderSetStatusNames.ACCEPTED:
            checkList = checkList.concat([orderSetStatusNames.PLACED]);
            break;
          case orderSetStatusNames.PREPARING:
            checkList = checkList.concat([orderSetStatusNames.ACCEPTED]);
            break;
          case orderSetStatusNames.PREPARED:
            checkList = checkList.concat([orderSetStatusNames.PREPARING]);
            fulfillmentCheck = true;
            acceptableFulfillments = [orderFulfillmentTypes.PICKUP, orderFulfillmentTypes.CAR, orderFulfillmentTypes.DELIVERY];
            break;
          case orderSetStatusNames.READY_FOR_PICKUP:
            checkList = checkList.concat([orderSetStatusNames.PREPARING, orderSetStatusNames.PREPARED]);
            fulfillmentCheck = true;
            acceptableFulfillments = [orderFulfillmentTypes.PICKUP, orderFulfillmentTypes.CAR];
            break;
          case orderSetStatusNames.WAITING_FOR_COURIER:
            checkList = checkList.concat([orderSetStatusNames.PREPARING, orderSetStatusNames.PREPARED]);
            fulfillmentCheck = true;
            acceptableFulfillments = [orderFulfillmentTypes.EXPRESS_DELIVERY, orderFulfillmentTypes.DELIVERY];
            break;
          case orderSetStatusNames.OUT_FOR_DELIVERY:
            checkList = checkList.concat([orderSetStatusNames.PREPARING, orderSetStatusNames.WAITING_FOR_COURIER]);
            fulfillmentCheck = true;
            acceptableFulfillments = [orderFulfillmentTypes.EXPRESS_DELIVERY, orderFulfillmentTypes.DELIVERY];
            break;
          case orderSetStatusNames.DELIVERY_DELAYED:
            checkList = checkList.concat([orderSetStatusNames.OUT_FOR_DELIVERY]);
            fulfillmentCheck = true;
            acceptableFulfillments = [orderFulfillmentTypes.EXPRESS_DELIVERY];
            break;
          case orderSetStatusNames.DELIVERED:
            checkList = checkList.concat([orderSetStatusNames.OUT_FOR_DELIVERY, orderSetStatusNames.DELIVERY_DELAYED]);
            fulfillmentCheck = true;
            acceptableFulfillments = [orderFulfillmentTypes.EXPRESS_DELIVERY, orderFulfillmentTypes.DELIVERY];
            break;
          case orderSetStatusNames.COMPLETED:
            checkList = checkList.concat([orderSetStatusNames.READY_FOR_PICKUP, orderSetStatusNames.DELIVERED]);
            break;
          case orderSetStatusNames.REJECTED:
            checkList = checkList.concat([orderSetStatusNames.PLACED]);
            break;
          default:
            errors.push(orderSetStatusError.INVALID_ORDER_SET_STATUS);
            break;
        }
        updatedOrderSetList = orderSets.map(orderSet => {
          if (checkList.includes(orderSet.currentStatus)) {
            if (fulfillmentCheck) {
              if (acceptableFulfillments.includes(orderSet.fulfillmentType)) return orderSet;
            } else return orderSet;
          }
          return null;
        });
        updatedOrderSetList = updatedOrderSetList.filter(n => n);
        if (updatedOrderSetList.length == 0) {
          errors.push(orderSetStatusError.UPDATED_STATUS_NOT_MATCHED_AN_ORDER_IN_LIST);
        }
      }
    } else errors.push(orderSetStatusError.UNAUTHORIZED_PROCESS);
    return { errors, updatedOrderSetList};
  }

  /**
   * check last status of order set is same with status which is selected
   * @param orderSetId {uuid}
   * @param status {orderSetStatus} - ACCEPTED, REJECTED etc.
   * @returns {boolean}
   */
  lastStatusValidation(orderSetId, status) {
    return this.roDb(this.tableName)
      .select('status')
      .where('order_set_id', orderSetId)
      .orderBy('created_at', 'desc')
      .first()
      .then(result => result.status === status);
  }

  async rejectOrder(orderSetId, rejectionInfo) {
    const isLastStatusRejected = await this.lastStatusValidation(
      orderSetId,
      orderSetStatusNames.REJECTED
    );
    if (isLastStatusRejected) {
      throw orderSetStatusError.STATUS_HAS_BEEN_ALREADY_CHANGED;
    }
    const orderSet = await this.context.orderSet
      .selectFields([
        'short_code',
        'is_cashback_coupon',
        'paid',
        'brand_location_id',
        'coupon_id',
        'customer_id',
      ])
      .where('id', orderSetId)
      .then(first);
    if (!orderSet) {
      throw orderSetError.INVALID_ORDER_SET;
    }
    const orderFulfillmentType = await this.context.orderFulfillment.getFulfillmentTypeByOrderSet(
      orderSetId
    );
    if (orderFulfillmentType === fulfillmentType.DELIVERY) {
      const url =
        deliveryServiceUrl + '/api/delivery-order/cancel/' + orderSet.shortCode;
      const options = {
        headers: {
          authorization: deliveryServiceToken,
        },
      };
      axios
        .patch(url, {}, options)
        .then(response =>
          console.log({
            func: 'rejectOrder.deliveryServiceCancel.success',
            response,
          })
        )
        .catch(err =>
          console.error({
            func: 'rejectOrder.deliveryServiceCancel.error',
            err,
          })
        );
    }
    await this.context.customerUsedPerk.changeUsedPerksStatus(orderSetId);
    const statusId = await this.save({
      orderSetId,
      status: orderSetStatusNames.REJECTED,
      rejectionReason: rejectionInfo.reason,
      note: rejectionInfo.note,
      createdAt: moment().toISOString(),
    }, this.context);

    // dont undo if its paid already and got cashback
    if (orderSet.couponId && !(orderSet.isCashbackCoupon && orderSet.paid)) {
      await this.context.coupon.incrementCouponCountersForCustomer(
        orderSet.couponId,
        orderSet.customerId,
        -1
      );
    }
    // await this.context.orderSet.orderSetRefund(orderSetId, 'ORDER_SET');

    return { statusId, orderSet };
  }

  async createRejectionForOrderSetId(orderSetId, rejectionInfo, context) {
    const orderFulfillment = await this.context.orderFulfillment.getByOrderSet(
      orderSetId
    );

    const orderSet = await this.context.orderSet.getById(orderSetId);

    if (
      orderFulfillment &&
      orderFulfillment.type === fulfillmentType.DELIVERY
    ) {
      const url =
        deliveryServiceUrl + '/api/delivery-order/cancel/' + orderSet.shortCode;
      try {
        const options = {
          headers: {
            authorization: deliveryServiceToken,
          },
        };

        const response = await axios.patch(url, {}, options);
        console.log('response.data', response);
        // if (response && response.data) {
        // }
      } catch (err) {
        console.log('getDeliveryStatusByShortCode:error', err.message);
      }
    }

    await this.context.withTransaction(
      'customerUsedPerk',
      'changeUsedPerksStatus',
      orderSetId,
      0
    );
    const statusId = await this.save({
      orderSetId,
      status: orderSetStatusNames.REJECTED,
      rejectionReason: rejectionInfo.reason,
      note: rejectionInfo.note,
      createdAt: moment().toISOString(),
    }, this.context);

    // dont undo if its paid already and got cashback
    if (orderSet && orderSet.isCashbackCoupon) {
      if (!orderSet.paid) {
        await context.orderSet.incrementCouponCountersForOrderSet(
          orderSetId,
          -1
        );
      }
    } else if (orderSet) {
      await context.orderSet.incrementCouponCountersForOrderSet(orderSetId, -1);
    }

    const notifs = await notificationsForStatusChange(
      orderSetId,
      orderSetStatusNames.REJECTED,
      context
    );
    const orderListeners = this.context.adminBranchSubscription
      .getByBranchId(orderSet.brandLocationId)
      .then(listeners => listeners.map(listener => listener.subscriptionToken));

    await orderListeners.then(tokens =>
      (tokens.length > 0
        ? firebase.sendNotifications(
          notificationType.ORDER_REJECTED,
          { orderSetId },
          {
            title: 'An Order is Rejected',
            body: 'A COFE order is rejected, please take action',
          },
          tokens
        )
        : Promise.resolve(true))
    );

    await this.context.notification.createAllIn(notifs);

    // await this.context.orderSet.orderSetRefund(orderSetId, 'ORDER_SET');

    return statusId;
  }

  async undoRejectionForOrderSetId(orderSetId) {
    const latestStatus = await this.getLatestByOrderSet(orderSetId);
    const orderSet = await this.context.orderSet.getById(orderSetId);
    // NOTE: orders not in rejected status cannot be un-rejected
    if (latestStatus.status !== orderSetStatusNames.REJECTED) {
      return Promise.reject(
        new Error('Order is not in a rejected state, unable to undo rejection.')
      );
    }

    const latestNonRejectionStatus = await this.db(this.tableName)
      .where('order_set_id', orderSetId)
      .where('status', '!=', orderSetStatusNames.REJECTED)
      .orderBy('created_at', 'desc')
      .limit(1)
      .then(first);
    const retainedData = pick(latestNonRejectionStatus, [
      'orderSetId',
      'status',
    ]);
    // allow to redeem once more if cashback and order was not paid or it was non cashback promo
    if (orderSet && orderSet.isCashbackCoupon) {
      if (!orderSet.paid) {
        await this.context.orderSet.incrementCouponCountersForOrderSet(
          orderSetId,
          1
        );
      }
    } else if (orderSet) {
      await this.context.orderSet.incrementCouponCountersForOrderSet(
        orderSetId,
        1
      );
    }
    const status = assign(retainedData, {
      createdAt: moment().toISOString(),
      note: 'John Doe un-rejected this order.', // TODO: wire up note a bit more
    });
    await this.context.withTransaction(
      'customerUsedPerk',
      'changeUsedPerksStatus',
      orderSetId,
      1
    );
    return this.save(status, this.context);
  }

  async createReportForOrderSetId(orderSetId, reportInfo) {
    const orderFulfillment = await this.context.orderFulfillment.getByOrderSet(
      orderSetId
    );
    const orderSet = await this.context.orderSet.getById(orderSetId);

    if (
      orderFulfillment &&
      orderFulfillment.type === fulfillmentType.DELIVERY
    ) {
      const url =
        deliveryServiceUrl + '/api/delivery-order/cancel/' + orderSet.shortCode;
      try {
        const options = {
          headers: {
            authorization: deliveryServiceToken,
          },
        };

        const response = await axios.patch(url, {}, options);
        console.log('response.data', response);
        // if (response && response.data) {
        // }
      } catch (err) {
        console.log('getDeliveryStatusByShortCode:error', err.message);
      }
    }

    await this.context.withTransaction(
      'customerUsedPerk',
      'changeUsedPerksStatus',
      orderSetId,
      0
    );
    const statusId = await this.save({
      orderSetId,
      status: orderSetStatusNames.REPORTED,
      reportReason: reportInfo.reason,
      note: reportInfo.note,
      createdAt: moment().toISOString(),
    }, this.context);
    const orderListeners = this.context.adminBranchSubscription
      .getByBranchId(orderSet.brandLocationId)
      .then(listeners => listeners.map(listener => listener.subscriptionToken));

    await orderListeners.then(tokens =>
      (tokens.length > 0
        ? firebase.sendNotifications(
          notificationType.ORDER_REPORTED,
          { orderSetId },
          {
            title: 'An Order is Reported',
            body: 'A COFE order is reported, please take action',
          },
          tokens
        )
        : Promise.resolve(true))
    );

    return statusId;
  }

  async save(input, context) {
    if (!('clientName' in input)) {
      switch (context.req.clientPlatform) {
        case 'vendor-portal':
          input = { ...input, clientName: orderSetStatusPlatforms.VENDOR_PORTAL };
          break;
        case 'admin-portal':
          input = { ...input, clientName: orderSetStatusPlatforms.ADMIN_PORTAL };
          break;
        case 'barista-mpos':
          input = { ...input, clientName: orderSetStatusPlatforms.BARISTA_MPOS };
          break;
        case 'driver':
          if (input.status == orderSetStatusNames.COMPLETED) {
            input = { ...input, clientName: orderSetStatusPlatforms.AUTOMATICALLY };
          } else
            input = { ...input, clientName: orderSetStatusPlatforms.DRIVER };
          break;
        case 'ios':
        case 'android':
          input = { ...input, clientName: orderSetStatusPlatforms.MOBIL };
          break;
        default:
          if (input.status == orderSetStatusNames.PLACED) {
            input = {...input, clientName: orderSetStatusPlatforms.MOBIL};
          }
      }
    }
    await this.context.orderSet.save({
      id: input.orderSetId,
      currentStatus: input.status,
    });
    this.context.kinesisLogger
      .sendLogEvent(
        {
          ...input,
        },
        kinesisEventTypes.orderStatusChangeSaved
      )
      .catch(err =>
        console.error({
          func: 'orderSetStatus.save.kinesisLogger.sendLogEvent',
          err,
        })
      );
    return super.save(input);
  }
}

module.exports = OrderSetStatus;
