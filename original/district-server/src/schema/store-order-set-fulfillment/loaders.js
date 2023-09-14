const DataLoader = require('dataloader');
const { map, find } = require('lodash');

function createLoaders(model) {
  return {
    byStoreOrderSet: new DataLoader(async storeOrderSetIds => {
      const fulfillments = await model
        .db(model.tableName)
        .select('*')
        .whereIn(`${model.tableName}.store_order_set_id`, storeOrderSetIds);

      return map(storeOrderSetIds, storeOrderSetId =>
        find(fulfillments, fulfillment => {
          if (fulfillment.storeOrderSetId === storeOrderSetId) {
            if (typeof fulfillment.deliveryAddress === 'string') {
              fulfillment.deliveryAddress = JSON.parse(
                fulfillment.deliveryAddress
              );
            }
            return true;
          }
          return false;
        })
      );
    }),
  };
}

module.exports = { createLoaders };
