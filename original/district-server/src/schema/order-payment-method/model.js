const BaseModel = require('../../base-model');
const { paymentStatusOrderType } = require('../root/enums');
const { createLoaders } = require('./loaders');

class OrderPaymentMethod extends BaseModel {
  constructor(db, context) {
    super(db, 'order_payment_methods', context);
    this.loaders = createLoaders(this);
  }

  async getLoyaltyOrderPaymentMethod(loyaltyOrderId) {
    const [paymentMethod] = await this.db(this.tableName)
      .where('order_type', paymentStatusOrderType.LOYALTY_ORDER)
      .andWhere('reference_order_id', loyaltyOrderId);
    return paymentMethod;
  }

  async getGiftCardOrderPaymentMethod(giftCardOrderId) {
    const [paymentMethod] = await this.db(this.tableName)
      .where('order_type', paymentStatusOrderType.GIFT_CARD_ORDER)
      .andWhere('reference_order_id', giftCardOrderId);
    return paymentMethod;
  }

  async getOrderSetPaymentMethod(orderSetId) {
    const [paymentMethod] = await this.db(this.tableName)
      .where('order_type', paymentStatusOrderType.ORDER_SET)
      .andWhere('reference_order_id', orderSetId);
    return paymentMethod;
  }

  async getStoreOrderSetPaymentMethod(storeOrderSetId) {
    const [paymentMethod] = await this.db(this.tableName)
      .where('order_type', paymentStatusOrderType.STORE_ORDER_SET)
      .andWhere('reference_order_id', storeOrderSetId);
    return paymentMethod;
  }

  async getSubscriptionOrderPaymentMethod(subscriptionOrderId) {
    const [paymentMethod] = await this.db(this.tableName)
      .where('order_type', paymentStatusOrderType.SUBSCRIPTION_ORDER)
      .andWhere('reference_order_id', subscriptionOrderId);
    return paymentMethod;
  }
}

module.exports = OrderPaymentMethod;
