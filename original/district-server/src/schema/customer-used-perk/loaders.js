const DataLoader = require('dataloader');
const { map } = require('lodash');

function createLoaders(model) {
  return {
    byOrderSet: new DataLoader(async orderSetIds => {
      const allCustomerUsedPerks = await model
        .roDb(model.tableName)
        .whereIn('order_set_id', orderSetIds);
      return map(orderSetIds, orderSetId => {
        return allCustomerUsedPerks.filter(
          item => item.orderSetId === orderSetId
        );
      });
    }),
  };
}

module.exports = { createLoaders };
