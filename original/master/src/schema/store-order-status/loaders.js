const DataLoader = require('dataloader');
const { map } = require('lodash');

function createLoaders(model) {
  return {
    statusHistory: new DataLoader(async storeOrderIds => {
      const statuses = await model
        .db(model.tableName)
        .select('*')
        .whereIn(`${model.tableName}.store_order_id`, storeOrderIds)
        .orderBy('created', 'desc');

      return map(storeOrderIds, storeOrderId =>
        statuses.filter(status => status.storeOrderId === storeOrderId)
      );
    }),
  };
}

module.exports = { createLoaders };
