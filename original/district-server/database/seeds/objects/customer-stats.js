/* eslint-disable camelcase */
const casual = require('casual');

module.exports = customers => {
  const customerStats = [];
  customers.forEach(customer => {
    customerStats.push({
      id: casual.uuid,
      customer_id: customer.id,
      total_orders: 14,
      total_kd_spent: 14.14,
    });
  });

  return customerStats;
};
