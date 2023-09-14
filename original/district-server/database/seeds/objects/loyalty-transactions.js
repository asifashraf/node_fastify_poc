/* eslint-disable camelcase */
const casual = require('casual');
const { toNumber } = require('lodash');
module.exports = orders => {
  const transactions = [];

  orders.forEach(order => {
    transactions.push({
      id: casual.uuid,
      reference_order_id: order.id,
      order_type: 'LOYALTY_ORDER',
      credit: toNumber(order.amount) + toNumber(order.bonus),
      customer_id: order.customer_id,
      currency_id: order.currency_id,
    });
  });

  return transactions;
};
