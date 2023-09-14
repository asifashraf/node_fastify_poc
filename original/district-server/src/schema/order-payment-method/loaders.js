const DataLoader = require('dataloader');
const { paymentStatusOrderType } = require('../root/enums');
const { map } = require('lodash');

function createLoaders(model) {
  return {
    byOrderSet: new DataLoader(async orderSetIds => {
      const paymentMethods = await model
        .roDb(model.tableName)
        .where('order_type', paymentStatusOrderType.ORDER_SET)
        .whereIn('reference_order_id', orderSetIds);
      return map(orderSetIds, orderSetId => {
        return paymentMethods.find(
          item => item.referenceOrderId === orderSetId
        );
      });
    }),
  };
}

module.exports = { createLoaders };
