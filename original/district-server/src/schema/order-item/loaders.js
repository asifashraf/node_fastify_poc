const DataLoader = require('dataloader');
const { map } = require('lodash');

function createLoaders(model) {
  return {
    byOrderSet: new DataLoader(async orderSetIds => {
      const orderItems = await model
        .db('order_items')
        .select('*')
        .whereIn('order_set_id', orderSetIds);

      return map(orderSetIds, orderSetId =>
        orderItems.filter(item => item.orderSetId === orderSetId)
      );
    }),
    byOrderSetWithMenuItem: new DataLoader(async orderSetIds => {
      const orderItems = await model
        .db('order_items')
        .select('order_items.*',
          'menu_items.type AS type')
        .join('menu_items', 'menu_items.id', 'order_items.menu_item_id')
        .whereIn('order_items.order_set_id', orderSetIds);

      return map(orderSetIds, orderSetId =>
        orderItems.filter(item => item.orderSetId === orderSetId)
      );
    }),
    byOrderSetWithDetail: new DataLoader(async orderSetIds => {
      const orderItems = await model
        .db('order_items')
        .select('order_items.*',
          'menu_items.type',
          'order_item_options.price AS oim_price',
          'order_item_options.compare_at_price AS oim_compareAtPrice')
        .join('order_item_options', 'order_item_options.order_item_id', 'order_items.id')
        .join('menu_items', 'menu_items.id', 'order_items.menu_item_id')
        .whereIn('order_items.order_set_id', orderSetIds);

      return map(orderSetIds, orderSetId =>
        orderItems.filter(item => item.orderSetId === orderSetId)
      );
    }),
  };
}

module.exports = { createLoaders };
