const DataLoader = require('dataloader');
const { map, find } = require('lodash');

function createLoaders(model) {
  return {
    totalCustomers: new DataLoader(async ids => {
      const customerCountList = await model
        .db('customer_groups_customers')
        .select('customer_group_id')
        .count('customer_id AS count')
        .groupBy('customer_group_id')
        .whereIn('customer_group_id', ids);
      return map(ids, id => {
        const totalCustomer = find(customerCountList, customerCount => customerCount.customerGroupId === id);
        return totalCustomer ? totalCustomer.count : 0;
      });
    }),
  };
}

module.exports = { createLoaders };
