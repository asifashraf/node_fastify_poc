const DataLoader = require('dataloader');
const { map } = require('lodash');
const { addLocalizationField } = require('../../lib/util');

function createLoaders(model) {
  return {
    byOrderItem: new DataLoader(async orderItemIds => {
      const orderItemsOptions = await model
        .roDb(model.tableName)
        .whereIn('order_item_id', orderItemIds);
      return map(orderItemIds, orderItemId => {
        return addLocalizationField(
          orderItemsOptions.filter(item => item.orderItemId === orderItemId),
          'value'
        );
      });
    }),
  };
}

module.exports = { createLoaders };
