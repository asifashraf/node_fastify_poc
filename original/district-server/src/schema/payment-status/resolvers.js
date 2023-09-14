const { cofePaymentErrors } = require('../../payment-service/error-model');
const { kinesisEventTypes } = require('../../lib/aws-kinesis-logging');
const { paymentStatusOrderType } = require('../root/enums');
const { property } = require('lodash');

module.exports = {
  PaymentStatus: {
    datetime: property('createdAt'),
    async cofePaymentError(
      { orderType, referenceOrderId, rawResponse },
      args,
      context
    ) {
      try {
        let model = null;
        switch (orderType) {
          case paymentStatusOrderType.ORDER_SET:
            model = 'orderSet';
            break;
          case paymentStatusOrderType.STORE_ORDER_SET:
            model = 'storeOrderSet';
            break;
          case paymentStatusOrderType.GIFT_CARD_ORDER:
            model = 'giftCardOrder';
            break;
          case paymentStatusOrderType.LOYALTY_ORDER:
            model = 'loyaltyOrder';
            break;
        }
        if (!model) return null;

        const { paymentProvider } = await context[model]
          .selectFields(['paymentProvider'])
          .where('id', referenceOrderId)
          .first();

        return context.paymentService.getCofePaymentError(
          paymentProvider,
          JSON.parse(rawResponse)
        );
      } catch (err) {
        context.kinesisLogger.sendLogEvent({
          referenceOrderId,
          rawResponse,
          err,
        }, kinesisEventTypes.cofePaymentErrorParseError)
          .catch(err => console.log(err));
        return cofePaymentErrors.SYSTEM_ERROR;
      }
    }
  },
};
