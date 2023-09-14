const {
  cSubscriptionCustomerAutoRenewalStatusActionSrc
} = require('../c-subscription-customer-auto-renewal-status/enum');
const {
  cSubscriptionCustomerAutoRenewalErrors
} = require('./enum');
module.exports = {
  CSubscriptionCustomerAutoRenewalStatus: {
    /**
     * @deprecated
     */
    paymentMethod({paymentInfo}, args, context) {
      return {
        imageUrl: paymentInfo.imageUrl,
        subText: paymentInfo.infoText
      };
    }
  },
  Mutation: {
    async cancelSubscriptionCustomerAutoRenewal(
      root,
      {subscriptionCustomerId},
      context
    ) {
      const subscriptionCustomer = await context.cSubscriptionCustomer.getById(
        subscriptionCustomerId
      );
      try {
        await context.withTransaction(
          'cSubscriptionCustomerAutoRenewal',
          'cancelAutoRenewal',
          subscriptionCustomer.subscriptionCustomerAutoRenewalId,
          cSubscriptionCustomerAutoRenewalStatusActionSrc.CUSTOMER,
        );
        const allActiveAutoRenewals = await context
          .cSubscriptionCustomerAutoRenewal
          .getAllActiveAutoRenewalsForCustomer(subscriptionCustomer.customerId);
        context.generalCCCService.sendItToSqs(
          'analytics',
          {
            analyticsProvider: 'BRAZE',
            data: {
              attributes: [
                {
                  'external_id': context.auth.id,
                  'subscription_autorenewal': allActiveAutoRenewals.length > 0,
                }
              ]
            }
          }
        ).catch(err => console.error(err));
        return true;
      } catch (err) {
        context.kinesisLogger.sendLogEvent(
          {
            error: err?.message || err,
            subscriptionCustomerId,
          },
          'subscription-customer-cancel-auto-renewal-error',
        ).catch(err => console.error(err));
        return false;
      }
    },
    async renewRedeemedSubscriptionNow(
      root,
      {subscriptionId},
      context
    ) {
      try {
        const subscriptionCustomer = await context.cSubscriptionCustomer
          .getByCustomerIdAndSubscriptionId(context.auth.id, subscriptionId);
        const lastTransaction = await context.cSubscriptionCustomerTransaction
          .getLatest(subscriptionCustomer.id);

        if (lastTransaction.remainingCups === 0) {
          const result = await context.cSubscriptionCustomer.finishSubscription(
            subscriptionCustomer.id
          );
          if (result.status) {
            const autoRenewalResult = await context.withTransaction(
              'cSubscriptionCustomerAutoRenewal',
              'renewSubscriptionCustomer',
              subscriptionCustomer.id
            );
            return autoRenewalResult;
          }
          return result;
        }
        return {
          status: false,
          error: cSubscriptionCustomerAutoRenewalErrors.NOT_FULLY_REDEEMED
        };
      } catch (err) {
        context.kinesisLogger.sendLogEvent(
          {
            error: err?.message || err,
            subscriptionId,
            customerId: context.auth.id,
          },
          'subscription-customer-auto-renewal-renew-now-error',
        ).catch(err => console.error(err));
        return {
          status: false,
          error: cSubscriptionCustomerAutoRenewalErrors.UNSPECIFIED_ERROR
        };
      }
    },
  },
};
