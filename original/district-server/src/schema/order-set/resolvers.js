const config = require('../../../config');
const { assign, first, find } = require('lodash');
const {
  addLocalizationField,
  // legacyPaymentMethodStub,
  formatError,
  errorLog,
  publishSubscriptionEvent,
} = require('../../lib/util');
const { paymentSchemes } = require('../../payment-service/enums');
const {
  couponDetailUsedOn,
  paymentStatusName,
  orderSetSubscriptionEvent,
  orderSetStatusName,
  notificationType,
  OrderRatingStatus,
  countryConfigurationKeys,
} = require('../root/enums');
const { convertLegacyPaymentMethod } = require('../order-payment-method/utils');
const firebase = require('../../lib/firebase');
const { orderFulfillmentTypes, skipOrderRatingError } = require('./enums');
//const toFoodicsSqs = require('../../lib/sqs-base')('to_foodics');
const { kinesisEventTypes } = require('../../lib/aws-kinesis-logging');

const SlackWebHookManager = require('../slack-webhook-manager/slack-webhook-manager');

const moment = require('moment');

module.exports = {
  OrderSet: {
    fulfillment({ id }, args, context) {
      return context.orderFulfillment.getByOrderSet(id);
    },
    isBeingFulfilled({ id }, args, context) {
      return context.orderSet.isBeingFulfilled(id);
    },
    items({ id, items }, args, context) {
      if (items) {
        return items;
      }
      return context.orderItem.getByOrderSetId(id);
    },
    internalComments({ id }, args, context) {
      return context.internalComment.getByOrderSetId(id);
    },
    customer({ customerId }, args, context) {
      return context.customer.getById(customerId);
    },
    coupon({ couponId }, args, context) {
      return context.coupon.getById(couponId);
    },
    async brandLocation({ brandLocationId }, args, context) {
      return context.brandLocation.getWithBrandById(brandLocationId);
    },
    // async currentStatus({ id }, args, context) {
    //   const latestStatus = await context.orderSetStatus.getLatestByOrderSet(id);
    //   if (latestStatus) {
    //     return latestStatus.status;
    //   } // TODO:: Should we return something special if no status is found? This is clearly an error
    // },
    statusHistory({ id }, args, context) {
      return context.orderSetStatus.getAllByOrderSet(id);
    },
    async payment({ id, merchantId }, args, context) {
      const paymentStatus = await context.paymentStatus.loaders.byOrderSet.load(
        id,
      );
      paymentStatus.merchantId = merchantId;
      return paymentStatus;
    },
    comments({ id }, args, context) {
      return context.orderSetComment.getAllByOrderSetId(id);
    },
    usedPerks({ id }, args, context) {
      return context.customerUsedPerk.loaders.byOrderSet.load(id);
    },
    async currentRewardProgramDetails(
      { brandLocationId, customerId },
      args,
      context,
    ) {
      const brandLocation = await context.brandLocation.getById(
        brandLocationId,
      );
      const reward = first(
        await context.reward.loaders.byBrand.load(brandLocation.brandId),
      );
      if (reward) {
        const r = await context.customer.getRewardProgramDetailsNew(
          customerId,
          reward.id,
        );
        return r;
      }
      return null;
    },
    async deliveryOrderStatus({ id, shortCode }, args, context) {
      const fulfillmentType = await context.orderFulfillment.getFulfillmentTypeByOrderSet(id);
      if (fulfillmentType === orderFulfillmentTypes.DELIVERY || fulfillmentType === orderFulfillmentTypes.EXPRESS_DELIVERY) {
        return context.orderSet.getDeliveryStatusByShortCode(shortCode);
      }
      return null;
    },
    async deliveryOrderStatusHistory({ id, shortCode }, args, context) {
      const fulfillmentType = await context.orderFulfillment.getFulfillmentTypeByOrderSet(id);
      if (fulfillmentType === orderFulfillmentTypes.DELIVERY || fulfillmentType === orderFulfillmentTypes.EXPRESS_DELIVERY) {
        return context.orderSet.getDeliveryStatusHistoryByShortCode(shortCode);
      }
      return [];
    },
    async currency({ currencyId }, args, context) {
      return addLocalizationField(
        addLocalizationField(
          await context.currency.getById(currencyId),
          'symbol',
        ),
        'subunitName',
      );
    },
    async paymentMethod({ id }, args, context) {
      const orderPaymentMethod = await context.orderPaymentMethod.loaders.byOrderSet.load(
        id,
      );
      let paymentMethod =
        orderPaymentMethod && orderPaymentMethod.paymentMethod
          ? orderPaymentMethod.paymentMethod
          : '{}';

      try {
        if (paymentMethod.paymentScheme) {
          return paymentMethod;
        } else if (paymentMethod.id) {
          return convertLegacyPaymentMethod(paymentMethod);
        } else if (paymentMethod.length > 0) {
          paymentMethod = JSON.parse(paymentMethod);
          if (paymentMethod.paymentScheme) {
            return paymentMethod;
          } else if (paymentMethod.id) {
            return convertLegacyPaymentMethod(paymentMethod);
          }
        }
        return null;
      } catch (err) {
        console.log('paymentMethod parse error', err);
        return null;
      }
    },
    usedCouponDetails({ id }, args, context) {
      return context.usedCouponDetail.getAllUsedOn(
        couponDetailUsedOn.ORDER_SET,
        id,
      );
    },
    computeInvoice({ id }, args, context) {
      return context.orderSet.getInvoiceByOrderSetId(id);
    },
    async newCustomer({ customerId, brandLocationId }, args, context) {
      const brandLocation = await context.brandLocation.getById(
        brandLocationId,
      );
      if (!brandLocation) {
        return false;
      }
      const noOfOrders = await context.orderSet.getCountByCustomerForBrand(
        customerId,
        brandLocation.brandId,
      );
      return noOfOrders <= 1;
    },
    arrivingTime({ id }, args, context) {
      return context.arrivingTime.getByOrderSetId(id);
    },
    async isPopupShown({ brandLocationId, customerId }, args, context) {
      const [{ iAmHere }, shownStatusForCustomer]
        = await Promise.all([context.brandLocation.getIAmHereActivity(brandLocationId), context.customer.getPopUpStatus(customerId)]);
      const isPopupShown = iAmHere ? shownStatusForCustomer : true;
      return isPopupShown;
    },
    async isArrivalEnabled({ id, currentStatus, brandLocationId }, args, context) {
      if (currentStatus === orderSetStatusName.REJECTED || currentStatus === orderSetStatusName.WAITING_FOR_COURIER || currentStatus === orderSetStatusName.OUT_FOR_DELIVERY || currentStatus === orderSetStatusName.DELIVERED || currentStatus === orderSetStatusName.COMPLETED || currentStatus === orderSetStatusName.REPORTED || currentStatus === orderSetStatusName.PAYMENT_FAILURE || currentStatus === orderSetStatusName.PAYMENT_CANCELED) {
        return false;
      }
      const { iAmHere } = await context.brandLocation.getIAmHereActivity(brandLocationId);
      if (!iAmHere) {
        return false;
      }
      const fulfillment = await context.orderFulfillment.getByOrderSet(id);
      if (!fulfillment || !fulfillment.type || (fulfillment.type != orderFulfillmentTypes.PICKUP && fulfillment.type != orderFulfillmentTypes.CAR)) {
        return false;
      }
      return true;
    },
    async orderRating({ id }, args, context) {
      return context.orderRating.getOrderRatingByOrderSetId(id);
    },
    async ratingStatus({ id, createdAt, ratingStatus }, args, context) {
      if (ratingStatus == OrderRatingStatus.PENDING || ratingStatus == OrderRatingStatus.SKIPPED) {
        const now = moment.utc();
        const end = moment(createdAt);
        const days = now.diff(end, 'days');
        if (days > 15) {
          ratingStatus = OrderRatingStatus.UNAVAILABLE;
          await context.orderSet.save({ id, ratingStatus });
        }
      }
      return ratingStatus;
    },
    async generalPaymentInformation({ id, couponId }, args, context) {
      const paymentMethods = await context.orderSet.getPaymentMethodsForOrder(id, couponId);
      const generalName = paymentMethods.reduce((prev, curr) => {
        if (!prev.en) {
          return {
            en: `${curr?.name?.en}`,
            ar: `${curr?.name?.ar}`,
            tr: `${curr?.name?.tr}`,
          };
        }
        return {
          en: `${prev.en} + ${curr?.name?.en}`,
          ar: `${prev.ar} + ${curr?.name?.ar}`,
          tr: `${prev.tr} + ${curr?.name?.tr}`,
        };
      }, { en: '', ar: '', tr: '' });
      let generalSubInfo = '';
      if (paymentMethods && paymentMethods.length == 1) {
        generalSubInfo = paymentMethods[0].subInfo;
      }
      return { name: generalName, subInfo: generalSubInfo, paymentMethods };
    },
    async driverInfo({ id, currentStatus }, args, context) {
      const fulfillment = await context.orderFulfillment.getByOrderSet(id);
      if (fulfillment.type == orderFulfillmentTypes.EXPRESS_DELIVERY &&
        [orderSetStatusName.OUT_FOR_DELIVERY, orderSetStatusName.DELIVERY_DELAYED, orderSetStatusName.DELIVERED, orderSetStatusName.COMPLETED].includes(currentStatus)) {
        const orderfulfillment = await context.orderFulfillment.getByOrderSet(id);
        const driver = await context.driver.getById(orderfulfillment.driverId);
        return driver;
      }
      return null;
    },
    async statusImageContent({ currentStatus }, { filters }, context) {
      switch (currentStatus) {
        case 'INITIATED':
        case 'PLACED':
        case 'ACCEPTED':
          return { url: 'https://d2v97fdht6b7g6.cloudfront.net/media/shared/checkout-screen/cofeapp_delivery_Placed.json' };

        case 'PREPARING':
        case 'PREPARED':
        case 'WAITING_FOR_COURIER':
          return { url: 'https://d2v97fdht6b7g6.cloudfront.net/media/shared/checkout-screen/cofeapp_delivery_Preparing.json' };

        case 'OUT_FOR_DELIVERY':
          return { url: 'https://d2v97fdht6b7g6.cloudfront.net/media/shared/checkout-screen/cofeapp_delivery_Out-for-Delivery.json' };

        case 'DELIVERY_DELAYED':
          return { url: 'https://d2v97fdht6b7g6.cloudfront.net/media/shared/checkout-screen/cofeapp_delivery_Delayed.json' };

        case 'DELIVERED':
        case 'READY_FOR_PICKUP':
        case 'COMPLETED':
          return { url: 'https://d2v97fdht6b7g6.cloudfront.net/media/shared/checkout-screen/cofeapp_delivery_Delivered.json' };

        case 'REJECTED':
        case 'REPORTED':
        case 'PAYMENT_FAILURE':
        case 'PAYMENT_CANCELED':
          return { url: 'https://d2v97fdht6b7g6.cloudfront.net/media/shared/checkout-screen/cofeapp_delivery_Placed.json' };
      }
      return { url: 'https://d2v97fdht6b7g6.cloudfront.net/media/shared/checkout-screen/cofeapp_delivery_Placed.json' };
    },
    async queue({ id }, args, context) {
      return context.orderSet.getQueueById({ id });
    },
    async expressOrderETA({ id, currentStatus }, args, context) {
      const order = await context.orderSet
        .selectFields(
          ['country_id', 'fulfillment_type'],
          context.orderSet.viewName
        )
        .where('id', id)
        .first();
      //const fulfillment = await context.orderFulfillment.getByOrderSet(id);
      if (order.fulfillmentType == orderFulfillmentTypes.EXPRESS_DELIVERY &&
        [orderSetStatusName.ACCEPTED, orderSetStatusName.PREPARING, orderSetStatusName.OUT_FOR_DELIVERY,
          orderSetStatusName.DELIVERY_DELAYED].includes(currentStatus)) {
        const configurations = await context.countryConfiguration.getByKeys([
          countryConfigurationKeys.ESTIMATED_TIME_IN_MINS_EXPRESS_DELIVERY,
          countryConfigurationKeys.DELAYED_TIME_IN_MINS_EXPRESS_DELIVERY
        ],
        order.countryId
        );
        let estimatedTime = find(configurations, configuration => configuration.configurationKey == countryConfigurationKeys.ESTIMATED_TIME_IN_MINS_EXPRESS_DELIVERY);
        estimatedTime = Number(estimatedTime?.configurationValue || config.expressDelivery.ETA.outForDeliveryCountdown);
        const allStatus = await context.orderSetStatus.getAllByOrderSet(id);
        const acceptedStatus = allStatus.find(status => status.status == orderSetStatusName.ACCEPTED);
        if (currentStatus == orderSetStatusName.DELIVERY_DELAYED) {
          let delayedTime = find(configurations, configuration => configuration.configurationKey == countryConfigurationKeys.DELAYED_TIME_IN_MINS_EXPRESS_DELIVERY);
          delayedTime = delayedTime?.configurationValue || config.expressDelivery.ETA.delayedDeliveryCountdown;
          estimatedTime += Number(delayedTime);
        }
        return moment(acceptedStatus.createdAt).add(Number(estimatedTime), 'm');
      }
      return null;
    },
  },
  OrderSetCard: {
    async orderRatingWithQuestions({ id, createdAt }, args, context) {
      const orderSet = await context.orderSet.getById(id);
      if (orderSet.ratingStatus == OrderRatingStatus.PENDING || orderSet.ratingStatus == OrderRatingStatus.SKIPPED) {
        const now = moment.utc();
        const end = moment(createdAt);
        const days = now.diff(end, 'days');
        if (days > 15) {
          const ratingStatus = OrderRatingStatus.UNAVAILABLE;
          await context.orderSet.save({ id, ratingStatus });
        }
      }
      return { orderSetId: id };
    },
  },
  OrderSetLite: {
    arrivingTime({ id }, args, context) {
      return context.arrivingTime.getByOrderSetId(id);
    },
    async rating({ id }, args, context) {
      const orderRating = await context.orderRating.getOrderRatingByOrderSetId(id);
      return orderRating?.rating || null;
    },
  },
  SubscriptionInvoiceDetail: {
    async name({ id }, args, context) {
      const subs = await context.cSubscription.getById(id);
      return subs.name;
    }
  },
  TrackedOrderSet: {
    async driverInfo({ id, fulfillmentType, status }, args, context) {
      if (fulfillmentType == orderFulfillmentTypes.EXPRESS_DELIVERY &&
        [orderSetStatusName.OUT_FOR_DELIVERY, orderSetStatusName.DELIVERY_DELAYED, orderSetStatusName.DELIVERED, orderSetStatusName.COMPLETED].includes(status)) {
        const orderfulfillment = await context.orderFulfillment.getByOrderSet(id);
        const driver = await context.driver.getById(orderfulfillment.driverId);
        return driver;
      }
      return null;
    },
    async statusImageContent({ status }, { filters }, context) {
      switch (status) {
        case 'INITIATED':
        case 'PLACED':
        case 'ACCEPTED':
          return { url: 'https://d2v97fdht6b7g6.cloudfront.net/media/shared/checkout-screen/cofeapp_delivery_Placed.json' };

        case 'PREPARING':
        case 'PREPARED':
        case 'WAITING_FOR_COURIER':
          return { url: 'https://d2v97fdht6b7g6.cloudfront.net/media/shared/checkout-screen/cofeapp_delivery_Preparing.json' };

        case 'OUT_FOR_DELIVERY':
          return { url: 'https://d2v97fdht6b7g6.cloudfront.net/media/shared/checkout-screen/cofeapp_delivery_Out-for-Delivery.json' };

        case 'DELIVERY_DELAYED':
          return { url: 'https://d2v97fdht6b7g6.cloudfront.net/media/shared/checkout-screen/cofeapp_delivery_Delayed.json' };

        case 'DELIVERED':
        case 'READY_FOR_PICKUP':
        case 'COMPLETED':
          return { url: 'https://d2v97fdht6b7g6.cloudfront.net/media/shared/checkout-screen/cofeapp_delivery_Delivered.json' };

        case 'REJECTED':
        case 'REPORTED':
        case 'PAYMENT_FAILURE':
        case 'PAYMENT_CANCELED':
          return { url: 'https://d2v97fdht6b7g6.cloudfront.net/media/shared/checkout-screen/cofeapp_delivery_Placed.json' };
      }
      return { url: 'https://d2v97fdht6b7g6.cloudfront.net/media/shared/checkout-screen/cofeapp_delivery_Placed.json' };
    },
    async expressOrderETA({ id, status }, args, context) {
      const order = await context.orderSet
        .selectFields(
          ['country_id', 'fulfillment_type'],
          context.orderSet.viewName
        )
        .where('id', id)
        .first();
      if (order.fulfillmentType == orderFulfillmentTypes.EXPRESS_DELIVERY &&
        [ orderSetStatusName.ACCEPTED, orderSetStatusName.PREPARING, orderSetStatusName.OUT_FOR_DELIVERY,
          orderSetStatusName.DELIVERY_DELAYED].includes(status)
      ) {
        const configurations = await context.countryConfiguration.getByKeys([
          countryConfigurationKeys.ESTIMATED_TIME_IN_MINS_EXPRESS_DELIVERY,
          countryConfigurationKeys.DELAYED_TIME_IN_MINS_EXPRESS_DELIVERY
        ],
        order.countryId
        );
        let estimatedTime = find(configurations, configuration => configuration.configurationKey == countryConfigurationKeys.ESTIMATED_TIME_IN_MINS_EXPRESS_DELIVERY);
        estimatedTime = Number(estimatedTime?.configurationValue || config.expressDelivery.ETA.outForDeliveryCountdown);
        const allStatus = await context.orderSetStatus.getAllByOrderSet(id);
        const acceptedStatus = allStatus.find(status => status.status == orderSetStatusName.ACCEPTED);
        if (status == orderSetStatusName.DELIVERY_DELAYED) {
          let delayedTime = find(configurations, configuration => configuration.configurationKey == countryConfigurationKeys.DELAYED_TIME_IN_MINS_EXPRESS_DELIVERY);
          delayedTime = delayedTime?.configurationValue || config.expressDelivery.ETA.delayedDeliveryCountdown;
          estimatedTime += Number(delayedTime);
        }
        return moment(acceptedStatus.createdAt).add(Number(estimatedTime), 'm');
      }
      return null;
    },
  },
  OrderCreatePayload: {
    async cofePaymentError({ orderSet }, args, context) {
      const { currentStatus } = await context.paymentStatus.loaders.byOrderSet.load(
        orderSet.id,
      );
      if (currentStatus.name !== 'PAYMENT_FAILURE') {
        return null;
      }
      return context.paymentService.getCofePaymentError(
        orderSet.paymentProvider,
        currentStatus.rawResponse
      );
    },
  },
  Mutation: {
    async orderCreate(root, { order }, context) {
      const orderWithCustomerId = assign(order, {
        customerId: context.auth.id,
        srcPlatform: context.req.xAppOs || null,
        srcPlatformVersion: context.req.xAppVersion || null,
      });
      const orderListeners = context.adminBranchSubscription
        .getByBranchId(order.brandLocationId)
        .then(listeners =>
          listeners.map(listener => listener.subscriptionToken),
        );

      await context.kinesisLogger.sendLogEvent(
        {
          orderWithCustomerId,
        },
        kinesisEventTypes.orderCreateBegin,
      );

      const result = await context.withTransaction(
        'orderSet',
        'orderCreate',
        orderWithCustomerId,
      );

      if (result.error) {
        errorLog('[orderCreate] errors', result.errors);
        await context.kinesisLogger.sendLogEvent(
          {
            orderWithCustomerId,
            error: result.error,
          },
          kinesisEventTypes.orderCreateError,
        );
        return formatError(result, orderWithCustomerId);
      }
      await context.kinesisLogger.sendLogEvent(
        {
          orderWithCustomerId,
          result,
        },
        kinesisEventTypes.orderCreateSuccess,
      );
      const { paymentUrl, orderSetId, paymentStatus, paymentMethod } = result;
      if (
        paymentStatus === paymentStatusName.PAYMENT_SUCCESS ||
        (paymentMethod.paymentScheme === paymentSchemes.CASH &&
          paymentStatus === paymentStatusName.PAYMENT_PENDING)
      ) {
        // If payment was set to success, then publish the order
        await publishSubscriptionEvent(
          context,
          orderSetId,
          orderSetSubscriptionEvent.ORDER_SET_CREATED,
        );
      }

      try {
        await orderListeners.then(tokens =>
          (tokens.length > 0
            ? firebase.sendNotifications(
              notificationType.ORDER_CREATED,
              { orderSetId },
              {
                title: 'New order received',
                body: 'You\'ve received a new COFE order',
              },
              tokens,
            )
            : Promise.resolve(true)),
        );
      } catch (err) {
        console.error(
          'Unable to send order creation notification to branch admins',
          err,
        );
      }

      const orderSet = await context.orderSet.getById(orderSetId);

      return {
        paymentUrl,
        orderSet,
      };
    },
    async createOrder(root, { order }, context) {
      const orderWithCustomerId = assign(order, {
        customerId: context.auth.id,
        srcPlatform: context.req.xAppOs || null,
        srcPlatformVersion: context.req.xAppVersion || null,
      });
      const orderListeners = context.adminBranchSubscription
        .getByBranchId(order.brandLocationId)
        .then(listeners =>
          listeners.map(listener => listener.subscriptionToken),
        );
      context.kinesisLogger.sendLogEvent(
        {
          orderWithCustomerId,
        },
        kinesisEventTypes.orderCreateBegin,
      );

      const result = await context.withTransaction(
        'orderSet',
        'createOrder',
        orderWithCustomerId,
      );

      if (result.error) {
        errorLog('[orderCreate] errors', result.errors);
        context.kinesisLogger.sendLogEvent(
          {
            orderWithCustomerId,
            error: result.error,
          },
          kinesisEventTypes.orderCreateError,
        );
        return formatError(result, orderWithCustomerId);
      }
      context.kinesisLogger.sendLogEvent(
        {
          orderWithCustomerId,
          result,
        },
        kinesisEventTypes.orderCreateSuccess,
      );
      const { paymentUrl, orderSetId, paymentStatus, paymentMethod } = result;

      // Check wallet and if negative balance then send slack message
      const customerId = context.auth.id;
      const { currencyId } = await context.db('order_sets').select('currency_id').where('id', orderSetId).first();
      const walletDetail = await context.walletAccount.getByCustomerIdAndCurrencyId(customerId, currencyId);
      if (walletDetail && parseFloat(walletDetail.total) < 0) {
        const customerBalance = await context.loyaltyTransaction.getBalanceByCustomer(
          customerId,
          currencyId
        );
        if (parseFloat(customerBalance) == 0 && parseFloat(walletDetail.regularAmount) == parseFloat(walletDetail.total)) {
          await context.db('wallet_accounts')
            .update('total', 0)
            .update('regular_amount', 0)
            .where('customer_id', customerId)
            .andWhere('currency_id', currencyId);
          SlackWebHookManager.sendTextToSlack(
            '[INFO] Negative balance detected and fixed by system for customer id : ' +
            customerId + ' and currency id : ' + currencyId
          );
        } else {
          SlackWebHookManager.sendTextToSlack(
            '[WARNING] Negative balance detected it should be checked manually for customer id : ' +
            customerId + ' and currency id : ' + currencyId
          );
        }
      }
      if (
        paymentStatus === paymentStatusName.PAYMENT_SUCCESS ||
        (paymentMethod.paymentScheme === paymentSchemes.CASH &&
          paymentStatus === paymentStatusName.PAYMENT_PENDING)
      ) {
        // If payment was set to success, then publish the order
        await publishSubscriptionEvent(
          context,
          orderSetId,
          orderSetSubscriptionEvent.ORDER_SET_CREATED,
        );

        // Moved here, if payment was successful or the payment method was cash the order status was set to "placed"
        // and send a notification to the vendor portal
        try {
          await orderListeners.then(tokens =>
            (tokens.length > 0
              ? firebase.sendNotifications(
                notificationType.ORDER_CREATED,
                { orderSetId },
                {
                  title: 'New order received',
                  body: 'You\'ve received a new COFE order',
                },
                tokens,
              )
              : Promise.resolve(true)),
          );
        } catch (err) {
          console.error(
            'Unable to send order creation notification to branch admins',
            err,
          );
        }
      }

      // for test we are sending all data but we have to simplify that query
      // on mobile side
      const orderSet = await context.orderSet.getById(orderSetId);

      return {
        paymentUrl,
        orderSet,
      };
    },
    async skipOrderRating(root, { orderSetId }, context) {
      const errors = [];
      const orderSet = await context.orderSet.getById(orderSetId);
      if (!orderSet) {
        errors.push(skipOrderRatingError.ORDER_NOT_FOUND);
      }
      if (orderSet.ratingStatus != OrderRatingStatus.PENDING) {
        errors.push(skipOrderRatingError.WRONG_RATING_STATUS);
      }
      if (errors.length > 0) {
        return { errors };
      } else {
        await context.orderSet.save({ id: orderSetId, ratingStatus: OrderRatingStatus.SKIPPED });
        return null;
      }
    },
  },
};
