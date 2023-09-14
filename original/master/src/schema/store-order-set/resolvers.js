const { first, get } = require('lodash');
const { addLocalizationField } = require('../../lib/util');

module.exports = {
  StoreOrderSet: {
    customer({ customerId }, args, context) {
      return context.customer.getById(customerId);
    },
    async currentStatus({ id }, args, context) {
      const latestStatus = await context.storeOrderSetStatus.getLatestByStoreOrderSet(
        id
      );
      if (latestStatus) {
        return latestStatus.status;
      }
    },
    statusHistory({ id }, args, context) {
      return context.storeOrderSetStatus.getAllByStoreOrderSet(id);
    },
    storeOrders({ id }, args, context) {
      return context.storeOrder.getAllByStoreOrderSet(id);
    },
    fulfillment({ id }, args, context) {
      return context.storeOrderSetFulfillment.getByStoreOrderSet(id);
    },
    computeInvoice(root, args, context) {
      return context.storeOrderSet.computeInvoice(root);
    },
    async payment({ id, merchantId }, args, context) {
      const statusHistory = await context.paymentStatus.getAllByStoreOrderSetId(
        id
      );
      const currentStatus = first(statusHistory);
      const { rawResponse } = currentStatus;
      let referenceId = null;
      // Wrap in try/catch in case rawResponse is not valid JSON
      try {
        referenceId = get(JSON.parse(rawResponse), 'ref', 0);
      } catch (err) {
        console.log(err.message);
      }

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
    async country({ countryId }, args, context) {
      return addLocalizationField(
        await context.country.getById(countryId),
        'name'
      );
    },
    async paymentMethod({ id }, args, context) {
      return context.storeOrderSet.getPaymentMethod({id});
    },
    async invoiceUrl({ id }, args, context) {
      return context.storeOrderSet.getStoreOrderInvoiceURL({ id });
    },
    async paymentMethodLabel(root, args, context) {
      return context.storeOrderSet.getPaymentMethodLabel(root);
    }
  },
};
