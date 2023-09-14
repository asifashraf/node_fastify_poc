const DataLoader = require('dataloader');
const { map } = require('lodash');

function createLoaders(model) {
  return {
    statusHistory: new DataLoader(async storeOrderSetIds => {
      const statuses = await model
        .db(model.tableName)
        .select('*')
        .whereIn(`${model.tableName}.store_order_set_id`, storeOrderSetIds)
        .orderBy('created', 'desc');

      return map(storeOrderSetIds, storeOrderSetId =>
        statuses.filter(status => status.storeOrderSetId === storeOrderSetId)
      );
    }),
  };
}

module.exports = { createLoaders };
