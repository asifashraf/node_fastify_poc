/* eslint-disable camelcase */
const casual = require('casual');
const { sample } = require('../utils.js');
const moment = require('moment');

module.exports = loyaltyOrders => {
  const statuses = [];
  const statusList = ['PAYMENT_PENDING', 'PAYMENT_SUCCESS', 'PAYMENT_FAILURE'];
  let createdAt = moment('2017-10-01T12:00:00+00:00').add(
    casual.integer(0, 120),
    'minutes'
  );

  loyaltyOrders.forEach(loyaltyOrder => {
    const name = sample(statusList);
    statuses.push({
      id: casual.uuid,
      name,
      order_type: 'LOYALTY_ORDER',
      created_at: createdAt.toISOString(),
      reference_order_id: loyaltyOrder.id,
      raw_response: { ref: casual.uuid },
    });
    createdAt = createdAt.add(casual.integer(10, 20), 'minutes');
  });

  return statuses;
};
