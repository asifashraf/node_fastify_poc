const DataLoader = require('dataloader');
const { paymentStatusOrderType } = require('../root/enums');
const { map, orderBy, first, get } = require('lodash');

function createLoaders(model) {
  return {
    byOrderSet: new DataLoader(async orderSetIds => {
      const allPaymentStatuses = await model
        .roDb(model.tableName)
        .whereIn('reference_order_id', orderSetIds)
        .andWhere('order_type', paymentStatusOrderType.ORDER_SET);
      return map(orderSetIds, orderSetId => {
        const paymentStatuses = allPaymentStatuses.filter(
          item => item.referenceOrderId === orderSetId
        );
        const statusHistory = orderBy(
          paymentStatuses,
          ['createdAt', 'sequence'],
          ['desc', 'desc']
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
        return {
          referenceId,
          currentStatus,
          statusHistory,
        };
      });
    }),
  };
}

module.exports = { createLoaders };
