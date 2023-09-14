const DataLoader = require('dataloader');
const { map } = require('lodash');

function createLoaders(model) {
  return {
    statusHistory: new DataLoader(async orderSetIds => {
      const statuses = await model
        .db('order_set_statuses')
        .select('*')
        .whereIn('order_set_statuses.order_set_id', orderSetIds)
        .orderBy('created_at', 'desc');

      return map(orderSetIds, orderSetId =>
        statuses.filter(status => status.orderSetId === orderSetId)
      );
    }),
  };
}

module.exports = { createLoaders };
