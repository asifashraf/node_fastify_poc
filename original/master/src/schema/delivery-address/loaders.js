const DataLoader = require('dataloader');
const { getExtraFields } = require('../customer/utils');
const { map } = require('lodash');
const { transformToCamelCase } = require('../../lib/util');

function createLoaders(model) {
  return {
    byOrderFulfillment: new DataLoader(async orderFulfillmentIds => {
      const deliveryAddresses = await model
        .getQuery()
        .whereIn('order_fulfillment_id', orderFulfillmentIds)
        .then(transformToCamelCase);
      return map(orderFulfillmentIds, async orderFulfillmentId => {
        const result = deliveryAddresses.find(
          item => item.orderFulfillmentId === orderFulfillmentId
        );
        if (result) {
          result.extraFields = await getExtraFields(
            await model.context.addressField.loaders.byCountryCode.load(
              result.countryCode
            ),
            result.dynamicData
          );
        }
        return result;
      });
    }),
  };
}

module.exports = { createLoaders };
