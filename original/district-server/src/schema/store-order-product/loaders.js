const DataLoader = require('dataloader');
const { map, find } = require('lodash');

function createLoaders(model) {
  return {
    byStoreOrder: new DataLoader(async storeOrderIds => {
      const statuses = await model
        .db(model.tableName)
        .select('*')
        .whereIn(`${model.tableName}.store_order_id`, storeOrderIds)
        .orderBy('created', 'desc');

      return map(storeOrderIds, storeOrderId =>
        statuses.filter(status => status.storeOrderId === storeOrderId)
      );
    }),
    currency: new DataLoader(async storeOrderProductIds => {
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
        .join(
          'store_order_products',
          'store_order_products.store_order_id',
          'store_orders.id'
        )
        .select(
          'currencies.*',
          'store_order_products.id as store_order_product_id'
        )
        .whereIn('store_order_products.id', storeOrderProductIds);
      return map(storeOrderProductIds, storeOrderProductId =>
        find(
          currencies,
          currency => currency.storeOrderProductId === storeOrderProductId
        )
      );
    }),
  };
}

module.exports = { createLoaders };
