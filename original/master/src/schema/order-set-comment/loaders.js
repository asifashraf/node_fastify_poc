const DataLoader = require('dataloader');
const { map } = require('lodash');

function createLoaders(model) {
  return {
    byOrderSet: new DataLoader(async orderSetIds => {
      const orderItems = await model
        .db('order_set_comments')
        .select('*')
        .whereIn('order_set_id', orderSetIds);

      return map(orderSetIds, orderSetId =>
        orderItems.filter(item => item.orderSetId === orderSetId)
      );
    }),
  };
}

module.exports = { createLoaders };
