const { omit } = require('lodash');

const BaseModel = require('../../base-model');
const {
  paymentStatusName,
  paymentStatusOrderType,
  orderSetStatusNames,
  notificationType,
} = require('../root/enums');
const { getModelNameByType } = require('../../lib/util');
const { createLoaders } = require('./loaders');
const firebase = require('../../lib/firebase');
const OrderCheckerService = require('../order-checker/service');

class PaymentStatus extends BaseModel {
  constructor(db, context) {
    super(db, 'payment_statuses', context);
    this.loaders = createLoaders(this);
  }

  getAllByOrderSetId(orderSetId) {
    return this.db(this.tableName)
      .where('reference_order_id', orderSetId)
      .andWhere('order_type', paymentStatusOrderType.ORDER_SET)
      .orderBy('created_at', 'desc')
      .orderBy('sequence', 'desc');
  }

  // this function should be deleted after all usages are replaced with getAllByCreditsOrderId
  getAllByLoyaltyOrderId(loyaltyOrderId) {
    return this.db(this.tableName)
      .where('reference_order_id', loyaltyOrderId)
      .andWhere('order_type', paymentStatusOrderType.LOYALTY_ORDER)
      .orderBy('created_at', 'desc')
      .orderBy('sequence', 'desc');
  }

  getAllByCreditsOrderId(creditsOrderId) {
    return this.db(this.tableName)
      .where('reference_order_id', creditsOrderId)
      .andWhere('order_type', paymentStatusOrderType.LOYALTY_ORDER)
      .orderBy('created_at', 'desc')
      .orderBy('sequence', 'desc');
  }

  getAllByGiftCardOrderId(giftCardOrderId) {
    return this.db(this.tableName)
      .where('reference_order_id', giftCardOrderId)
      .andWhere('order_type', paymentStatusOrderType.GIFT_CARD_ORDER)
      .orderBy('created_at', 'desc')
      .orderBy('sequence', 'desc');
  }

  getAllByStoreOrderSetId(storeOrderSetId) {
    return this.db(this.tableName)
      .where('reference_order_id', storeOrderSetId)
      .andWhere('order_type', paymentStatusOrderType.STORE_ORDER_SET)
      .orderBy('created_at', 'desc')
      .orderBy('sequence', 'desc');
  }

  getAllBySubscriptionOrderId(subscriptionOrderId) {
    return this.db(this.tableName)
      .where('reference_order_id', subscriptionOrderId)
      .andWhere('order_type', paymentStatusOrderType.SUBSCRIPTION_ORDER)
      .orderBy('created_at', 'desc')
      .orderBy('sequence', 'desc');
  }

  async save(args) {
    const referenceOrderId = args.referenceOrderId;
    const orderType = args.orderType;
    const newStatusName = args.name;
    const psResponse = args.rawResponse;
    const isCashPayment = args.isCashPayment || false;
    const paymentProvider = args.paymentProvider;
    const countryIso = args.countryIso;
    const paymentMethod = args.paymentMethod;

    const paymentStatusToBeSaved = omit(
      args, ['isCashPayment', 'paymentProvider', 'countryIso', 'paymentMethod']
    );

    const res = await super.save(paymentStatusToBeSaved);

    // Get the correct Model and handle promises
    const model = getModelNameByType(orderType);
    const promises = [];
    if (newStatusName === paymentStatusName.PAYMENT_PENDING) {
      const orderChecker = new OrderCheckerService(this.context);
      orderChecker.checkOrderAfterWait({
        referenceOrderId,
        orderType,
        paymentProvider,
        paymentMethod,
        countryIso,
        paymentProviderResponse: psResponse,
      }).catch(() => {});
    }
    if (
      orderType === paymentStatusOrderType.ORDER_SET &&
      newStatusName === paymentStatusName.PAYMENT_FAILURE
    ) {
      await this.context.orderSetStatus.setStatusForOrderSetId(
        referenceOrderId,
        orderSetStatusNames.PAYMENT_FAILURE,
        this.context
      );
    }
    if (
      referenceOrderId &&
      newStatusName !== paymentStatusName.PAYMENT_PENDING &&
      psResponse
    ) {
      // Both loyaltyOrder and orderSet send Payment Status Change Notifications
      promises.push(
        this.context[model].sendPaymentStatusChangeNotifications(
          referenceOrderId,
          newStatusName,
          psResponse
        )
      );

      // Only OrderSets increment coupons/vouchers
      if (
        orderType === paymentStatusOrderType.ORDER_SET &&
        newStatusName === paymentStatusName.PAYMENT_SUCCESS
      ) {
        const context = this.context;
        if (!isCashPayment) {
          // orders paid with cash are marked as completed on payment success
          promises.push(
            this.context.orderSetStatus.setStatusForOrderSetId(
              referenceOrderId,
              orderSetStatusNames.PLACED,
              context
            )
          );
          try {
            const order = await context.orderSet.getById(referenceOrderId);
            /**
             * TODO: Websocket NEW_ORDER integration for mpos
             */
            // await context.brandLocationDevice.checkAndSendNewOrder(order);
            await context.adminBranchSubscription
              .getByBranchId(order.brandLocationId)
              .then(listeners =>
                listeners.map(listener => listener.subscriptionToken)
              )
              .then(tokens =>
                (tokens.length > 0
                  ? firebase.sendNotifications(
                    notificationType.ORDER_CREATED,
                    { orderSetId: referenceOrderId },
                    {
                      title: 'New order received',
                      body: "You've received a new COFE order",
                    },
                    tokens
                  )
                  : Promise.resolve(true))
              );
          } catch (err) {
            console.error(
              'Unable to send order creation notification to branch admins',
              err
            );
          }
        }
        promises.push(
          this.context.orderSet.save({
            id: referenceOrderId,
            paid: true,
            amountDue: 0.0,
          }),
          // here we should subtract perks for payment method: CARD, KNET, CREDITS
          // for CASH orders perks are subtracted when placing order
          this.context.withTransaction(
            'customerUsedPerk',
            'changeUsedPerksStatus',
            referenceOrderId,
            1
          )
        );
      }
    } else {
      // send in case if the order is cash
      promises.push(
        this.context[model].sendPaymentStatusChangeNotifications(
          referenceOrderId,
          newStatusName,
          psResponse
        )
      );
      /**
       * TODO: TODO: Websocket NEW_ORDER integration for mpos
       */
      // if (
      //   orderType === paymentStatusOrderType.ORDER_SET &&
      //   newStatusName === paymentStatusName.PAYMENT_PENDING &&
      //   isCashPayment
      // ) {
      //   const order = await this.context.orderSet.getById(referenceOrderId);
      //   await this.context.brandLocationDevice.checkAndSendNewOrder(order);
      // }
    }
    await Promise.all(promises);
    // calc revenue
    // await this.context.orderRevenue.calculateRevenue(
    //   orderType,
    //   referenceOrderId
    // );
    return res;
  }
}

module.exports = PaymentStatus;
