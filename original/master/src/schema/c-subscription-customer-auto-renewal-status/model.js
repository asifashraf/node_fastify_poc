/* eslint-disable camelcase */
const BaseModel = require('../../base-model');
const { cSubscriptionCustomerAutoRenewalStatusActionType } = require('./enum');

class CSubscriptionCustomerAutoRenewalStatus extends BaseModel {
  constructor(db, context) {
    super(db, 'subscription_customer_auto_renewal_statuses', context);
  }

  cancelAutoRenewal(subscriptionCustomerAutoRenewalId, actionSrc) {
    return this.save({
      subscriptionsAutoRenewalId: subscriptionCustomerAutoRenewalId,
      actionSrc,
      actionType: cSubscriptionCustomerAutoRenewalStatusActionType.CANCELLATION,
    });
  }

  getLatestPaymentStatusByAutoRenewalId(customerSubscriptionAutoRenewalId) {
    return this.db(this.tableName)
      .where('subscriptions_auto_renewal_id', customerSubscriptionAutoRenewalId)
      .andWhere(
        'action_type',
        cSubscriptionCustomerAutoRenewalStatusActionType.PAYMENT
      )
      .orderBy('sequence', 'desc')
      .first();
  }
}


module.exports = CSubscriptionCustomerAutoRenewalStatus;
