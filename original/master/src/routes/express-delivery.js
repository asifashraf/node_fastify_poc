const express = require('express');
const moment = require('moment');
const config = require('../../config');
const { map, filter, find } = require('lodash');
const { addLocalizationMultipleFields } = require('../lib/util');
const {
  orderSetStatusNames,
  orderSetStatusName,
  countryConfigurationKeys,
} = require('../schema/root/enums');
const {
  deleteOtherDriversKeyByOrderId,
  updateDriverKeyTTLByOrderId,
} = require('../schema/driver/redis-helper');

// eslint-disable-next-line new-cap
const router = express.Router();

const ACCEPTED_STATUS = {
  [orderSetStatusNames.OUT_FOR_DELIVERY]: [orderSetStatusNames.PREPARING, orderSetStatusNames.READY_FOR_PICKUP, orderSetStatusNames.OUT_FOR_DELIVERY],
  [orderSetStatusNames.DELIVERY_DELAYED]: [orderSetStatusNames.OUT_FOR_DELIVERY],
  [orderSetStatusNames.DELIVERED]: [orderSetStatusNames.OUT_FOR_DELIVERY, orderSetStatusNames.DELIVERY_DELAYED],
};

router.route('/info').get(async (req, res) => {
  try {
    const { queryContextWithoutAuth: context } = req.app;
    const { orderSetId } = req;

    const select = `vo.id, vo.short_code, vo.fulfillment_type, vo.created_at, vo.branch_name, vo.brand_location_id, of.driver_id, vo.current_status,
      vo.customer_id, vo.customer_first_name, vo.customer_last_name, vo.customer_phone_number, of.fulfillment_id, vo.brand_id, vo.country_id`;

    const [order, orderStatus, orderQueue] = await Promise.all([
      context.db(`${context.orderSet.viewName} as vo`)
        .select(context.db.raw(select))
        .leftJoin('order_fulfillment as of', 'of.order_set_id', 'vo.id')
        .where('vo.id', orderSetId)
        .first(),
      context.orderSetStatus.getAllByOrderSet(orderSetId),
      context.orderSet.getQueueById({ id: orderSetId }),
    ]);

    if (!order.driverId && order.currentStatus == orderSetStatusName.OUT_FOR_DELIVERY) {
      orderStatus.shift();
    }
    const response = {
      order: {
        'id': order.id,
        'queue': orderQueue,
        'shortCode': order.shortCode,
        'createdAt': order.createdAt,
        'statusHistory': orderStatus
      }
    };

    const [
      brandLocationRaw,
      brandRaw,
      countryRaw,
      brandLocationAddress,
    ] = await Promise.all([
      context.brandLocation.getById(order.brandLocationId),
      context.brand.getById(order.brandId),
      context.country.getById(order.countryId),
      context.brandLocationAddress.getFullByBrandLocation(order.brandLocationId),
    ]);

    const country = addLocalizationMultipleFields(countryRaw, ['name']);
    const brand = addLocalizationMultipleFields(brandRaw, ['name']);
    const brandLocation = addLocalizationMultipleFields(brandLocationRaw, ['name']);
    const brandLocationAddressText = `${brandLocationAddress.street} ${brandLocationAddress.neighborhood} ${brandLocationAddress.city}`;
    const brandLocationGoogleMaps = `https://www.google.com/maps?q=${brandLocationAddress.latitude},${brandLocationAddress.longitude}`;
    response.branchInfo = {
      'brand': {
        'name': brand.name,
        'country': {
          name: country.name,
          isoCode: country.isoCode,
          timeZoneIdentifier: country.timeZoneIdentifier,
        },
      },
      'name': brandLocation.name,
      'address': brandLocationAddressText,
      'googleLink': brandLocationGoogleMaps,
    };

    const customer = {
      'name': `${order.customerFirstName} ${order.customerLastName}`,
      'phoneNumber': order.customerPhoneNumber,
    };

    const customerAddress = await context.customerAddress.getById(order.fulfillmentId);
    if (customerAddress && customerAddress.extraFields.length != 0) {
      const nonEmptyAddressFields = filter(customerAddress.extraFields, field => field.value);
      const strFields = map(nonEmptyAddressFields, field => {
        return field.value;
      });
      customer.address = strFields.join(', ') + ', ' + customerAddress.city;
      customer.googleLink = `https://www.google.com/maps?q=${customerAddress.latitude},${customerAddress.longitude}`;
    }

    response.customer = customer;
    return res.status(200).json({
      success: true,
      ...response,
    });
  } catch (error) {
    return res
      .status(500)
      .json({
        success: false,
        message: 'Internal Server Error'
      });
  }
});

router.route('/update-order-status').post(async (req, res) => {
  try {
    const { queryContextWithoutAuth: context } = req.app;
    const { body, orderSetId, driverId } = req;
    const { status } = body;

    //const orderSet = await context.orderSet.getById(orderSetId);
    const select = 'id, short_code, current_status, country_id';
    const orderSet = await context.db(context.orderSet.viewName)
      .select(context.db.raw(select))
      .where('id', orderSetId)
      .first();

    if (Object.keys(ACCEPTED_STATUS).includes(status)) {
      if (ACCEPTED_STATUS[status].includes(orderSet.currentStatus)) {
        context.req.clientPlatform = 'driver';
        //const { configurationValue } = await context.countryConfiguration.getByKey(countryConfigurationKeys.ESTIMATED_TIME_IN_MINS_EXPRESS_DELIVERY, orderSet.countryId);
        const configurations = await context.countryConfiguration.getByKeys([
          countryConfigurationKeys.ESTIMATED_TIME_IN_MINS_EXPRESS_DELIVERY,
          countryConfigurationKeys.DELAYED_TIME_IN_MINS_EXPRESS_DELIVERY
        ],
        orderSet.countryId
        );
        let estimatedTimeMin = find(configurations, configuration => configuration.configurationKey == countryConfigurationKeys.ESTIMATED_TIME_IN_MINS_EXPRESS_DELIVERY);
        estimatedTimeMin = estimatedTimeMin?.configurationValue || config.expressDelivery.ETA.outForDeliveryCountdown;
        if (status == orderSetStatusName.OUT_FOR_DELIVERY) {
          if (orderSet.currentStatus != orderSetStatusName.OUT_FOR_DELIVERY) {
            await context.orderSetStatus.setStatusForOrderSetId(orderSetId, status, context);
          }
          await deleteOtherDriversKeyByOrderId(orderSetId, driverId);
          await context.orderFulfillment.assignDriverByOrderSetId(orderSetId, driverId);
        } else if (status == orderSetStatusName.DELIVERY_DELAYED) {
          await context.orderSetStatus.setStatusForOrderSetId(orderSetId, status, context);
          let delayedTime = find(configurations, configuration => configuration.configurationKey == countryConfigurationKeys.DELAYED_TIME_IN_MINS_EXPRESS_DELIVERY);
          delayedTime = delayedTime?.configurationValue || config.expressDelivery.ETA.delayedDeliveryCountdown;
          estimatedTimeMin += delayedTime;
        } else if (status == orderSetStatusName.DELIVERED) {
          await context.orderSetStatus.setStatusForOrderSetId(orderSetId, status, context);
          await context.orderSetStatus.setStatusForOrderSetId(orderSetId, orderSetStatusNames.COMPLETED, context);
          await updateDriverKeyTTLByOrderId(orderSetId, driverId);
          estimatedTimeMin = null;
        }
        const orderStatusList = await context.orderSetStatus.getAllByOrderSet(orderSetId);
        let estimatedTime = null;
        if (estimatedTimeMin) {
          const pickUpStatus = orderStatusList.find(orderStatus => orderStatus.status == orderSetStatusName.OUT_FOR_DELIVERY);
          estimatedTime = moment(pickUpStatus.createdAt).add(estimatedTimeMin, 'm');
        }
        return res
          .status(200)
          .json({
            success: true,
            orderSetId,
            orderStatusHistory: orderStatusList,
            orderLatestStatus: orderStatusList[0],
            estimatedTime
          });
      } else {
        return res
          .status(400)
          .json({
            success: false,
            message: 'Not allowed process',
            params: {
              orderSetId,
              status
            },
            currentStatus: orderSet.currentStatus,
          });
      }
    } else {
      return res
        .status(400)
        .json({
          success: false,
          message: 'Undefined order status',
          params: {
            orderSetId,
            status
          }
        });
    }
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({
        success: false,
        message: 'Internal Server Error'
      });
  }
});

module.exports = router;
