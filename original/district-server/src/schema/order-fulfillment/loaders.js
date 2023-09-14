const DataLoader = require('dataloader');
const { map, first } = require('lodash');

function createLoaders(model) {
  return {
    byOrderSet: new DataLoader(async orderSetIds => {
      const fulfillment = await model
        .db('order_fulfillment')
        .select('*')
        .whereIn('order_fulfillment.order_set_id', orderSetIds);

      return map(orderSetIds, orderSetId =>
        first(fulfillment.filter(item => item.orderSetId === orderSetId))
      );
    }),
  };
}

module.exports = { createLoaders };
