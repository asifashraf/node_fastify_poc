const DataLoader = require('dataloader');
const { map, first } = require('lodash');

function createLoaders(model) {
  return {
    byOrderSet: new DataLoader(async orderSetIds => {
      const rating = await model
        .db('order_rating')
        .select('*')
        .whereIn('order_rating.order_set_id', orderSetIds);

      return map(orderSetIds, orderSetId =>
        first(rating.filter(item => item.orderSetId === orderSetId))
      );
    }),
  };
}

module.exports = { createLoaders };
