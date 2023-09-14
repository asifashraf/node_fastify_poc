/* eslint-disable camelcase */
const { sampleSize } = require('../utils.js');
const casual = require('casual');

module.exports = (customers, orderSets) => {
  const relations = [];

  customers.forEach(customer => {
    const sampleSets = sampleSize(orderSets, casual.integer(1, 2));

    sampleSets.forEach(orderSet => {
      relations.push({
        order_set_id: orderSet.id,
        customer_id: customer.id,
      });
    });
  });

  return relations;
};
