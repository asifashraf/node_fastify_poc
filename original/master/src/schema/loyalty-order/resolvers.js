const { first, get, assign } = require('lodash');

const { addLocalizationField, formatError } = require('../../lib/util');
const { convertLegacyPaymentMethod } = require('../order-payment-method/utils');

module.exports = {
  Mutation: {
    async loyaltyOrderCreate(root, { order }, context) {
      const orderWithCustomerId = assign(order, {
        customerId: context.auth.id,
      });
      // CreateOrder will Internally validate data
      const result = await context.withTransaction(
        'loyaltyOrder',
        'create',
        orderWithCustomerId
      );
      if (result.error) return formatError(result, orderWithCustomerId);
      const { paymentUrl, loyaltyOrderId } = result;
      return {
        paymentUrl,
        order: context.loyaltyOrder.getById(loyaltyOrderId),
      };
    },
  },
  LoyaltyOrder: {
    customer({ customerId }, args, context) {
      return context.customer.getById(customerId);
    },
    country({ currencyId }, args, context) {
      return context.country.getByCurrencyId(currencyId);
    },
    async payment({ id, merchantId }, args, context) {
      const statusHistory = await context.paymentStatus.getAllByLoyaltyOrderId(
        id
      );
      const currentStatus = first(statusHistory);
      const { rawResponse } = currentStatus;
      let referenceId = null;
      // Wrap in try/catch in case rawResponse is not valid JSON
      try {
        referenceId = get(JSON.parse(rawResponse), 'ref', 0);
      } catch (err) {}

      const paymentInfo = {
        merchantId,
        referenceId,
        currentStatus,
        statusHistory,
      };

      return paymentInfo;
    },
    async currency({ currencyId }, args, context) {
      return addLocalizationField(
        addLocalizationField(
          await context.currency.getById(currencyId),
          'symbol'
        ),
        'subunitName'
      );
    },
    loyaltyTier({ loyaltyTierId }, args, context) {
      return context.loyaltyTier.getById(loyaltyTierId);
    },
    async paymentMethod({ id }, args, context) {
      const orderPaymentMethod = await context.orderPaymentMethod.getLoyaltyOrderPaymentMethod(
        id
      );
      const paymentMethod =
        orderPaymentMethod && orderPaymentMethod.paymentMethod
          ? orderPaymentMethod.paymentMethod
          : {};

      if (paymentMethod.paymentScheme) {
        return paymentMethod;
      } else if (paymentMethod.id) {
        return convertLegacyPaymentMethod(paymentMethod);
      }

      return null;
    },
  },
};
