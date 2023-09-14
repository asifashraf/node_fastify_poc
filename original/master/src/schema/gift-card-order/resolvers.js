const { first, get, assign } = require('lodash');
const moment = require('moment');

const { paymentStatusName, giftCardStatus, inactiveGiftCardError} = require('../root/enums');
const { formatError, formatErrorResponse, uuid } = require('../../lib/util');
const { convertLegacyPaymentMethod } = require('../order-payment-method/utils');

module.exports = {
  Mutation: {
    async giftCardOrderCreate(root, { order }, context) {
      const orderWithCustomerId = assign(order, {
        customerId: context.auth.id,
      });
      // CreateOrder will Internally validate data
      const result = await context.withTransaction(
        'giftCardOrder',
        'create',
        orderWithCustomerId
      );
      if (result.error) return formatError(result, orderWithCustomerId);
      const { paymentUrl, giftCardOrderId } = result;
      return {
        paymentUrl,
        order: context.giftCardOrder.getById(giftCardOrderId),
      };
    },
    async deactivateGiftCardOrder(root, {id}, context) {
      const auth = context.auth;
      const admin = await context.admin.getByAuthoId(auth.id);
      if (!admin || (admin && auth.isVendorAdmin)) {
        return formatErrorResponse([inactiveGiftCardError.UNAUTHORIZED_ADMIN]);
      }
      const validationErrors = await context.giftCardOrder.validateForInactive(id);

      if (validationErrors.length > 0) {
        return formatErrorResponse(validationErrors);
      }

      await context.giftCard.updateGiftCardStatusByGiftCardOrderId(id, giftCardStatus.INACTIVE);
      return {
        deactivated: true,
        giftCardOrder: context.giftCardOrder.getById(id)
      };
    }
  },
  GiftCardOrder: {
    async country({ id }, args, context) {
      return context.giftCardOrder.loaders.country.load(id);
    },
    async currency({ id }, args, context) {
      return context.giftCardOrder.loaders.currency.load(id);
    },
    async giftCardTemplate({ id }, args, context) {
      return context.giftCardOrder.loaders.giftCardTemplate.load(id);
    },
    async customer({ id }, args, context) {
      return context.giftCardOrder.loaders.customer.load(id);
    },
    async giftCard({ id }, args, context) {
      const g = await context.giftCard.getByGiftCardOrderId(id);
      return g;
    },
    async payment({ id, merchantId, paymentMethod }, args, context) {
      const statusHistory = await context.paymentStatus.getAllByGiftCardOrderId(
        id
      );
      if (statusHistory.length === 0) {
        statusHistory.push({
          id: uuid.get(),
          createdAt: moment().format(),
          name:
            paymentMethod === 'N/A' // iOS workaround for generated gift cards
              ? paymentStatusName.PAYMENT_SUCCESS
              : paymentStatusName.NOT_APPLICABLE,
        });
      }

      const currentStatus = first(statusHistory);
      let referenceId = null;
      // Wrap in try/catch in case rawResponse is not valid JSON
      try {
        const { rawResponse } = currentStatus;
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
    async paymentMethod({ id }, args, context) {
      const orderPaymentMethod = await context.orderPaymentMethod.getGiftCardOrderPaymentMethod(
        id
      );
      const paymentMethod =
        orderPaymentMethod && orderPaymentMethod.paymentMethod
          ? orderPaymentMethod.paymentMethod
          : {};

      if (paymentMethod.paymentScheme) {
        return paymentMethod;
      }

      return convertLegacyPaymentMethod(paymentMethod);
    },
  },
};
