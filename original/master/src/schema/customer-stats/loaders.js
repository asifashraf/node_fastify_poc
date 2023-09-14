const DataLoader = require('dataloader');
const { map, flatten } = require('lodash');

function createLoaders(model) {
  return {
    getByCustomer: new DataLoader(async customerIds => {
      const stats = await model
        .db('customer_stats')
        .whereIn('customer_id', flatten(customerIds));

      return map(customerIds, customerId =>
        stats.filter(stat => stat.customerId === customerId)
      );
    }),
  };
}

module.exports = { createLoaders };
