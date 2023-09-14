const DataLoader = require('dataloader');
const { map, find } = require('lodash');

function createLoaders(model) {
  return {
    byStoreOrderSet: new DataLoader(async storeOrderSetIds => {
      const storeOrders = await model
        .db(model.tableName)
        .select('*')
        .whereIn(`${model.tableName}.store_order_set_id`, storeOrderSetIds)
        .orderBy('created', 'desc');

      return map(storeOrderSetIds, storeOrderSetId =>
        storeOrders.filter(
          storeOrder => storeOrder.storeOrderSetId === storeOrderSetId
        )
      );
    }),
    byBrandId: new DataLoader(async brandIds => {
      const storeOrders = await model
        .db(model.tableName)
        .select('*')
        .whereIn(`${model.tableName}.brand_id`, brandIds)
        .orderBy('created', 'desc');

      return map(brandIds, brandId =>
        storeOrders.filter(storeOrder => storeOrder.brandId === brandId)
      );
    }),
    currency: new DataLoader(async storeOrderIds => {
      const currencies = await model
        .db('currencies')
        .join(
          'store_order_sets',
          'store_order_sets.currency_id',
          'currencies.id'
        )
        .join(
          'store_orders',
          'store_orders.store_order_set_id',
          'store_order_sets.id'
        )
        .select('currencies.*', 'store_orders.id as store_order_id')
        .whereIn('store_orders.id', storeOrderIds);
      return map(storeOrderIds, storeOrderId =>
        find(currencies, currency => currency.storeOrderId === storeOrderId)
      );
    }),
  };
}

module.exports = { createLoaders };
