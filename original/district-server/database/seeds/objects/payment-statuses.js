/* eslint-disable camelcase */
const casual = require('casual');
const moment = require('moment');
const { sample } = require('../utils.js');

module.exports = orderSets => {
  const statusList = ['PAYMENT_PENDING', 'PAYMENT_SUCCESS', 'PAYMENT_FAILURE'];
  const orderStatuses = [];
  let createdAt = moment('2017-10-01T12:00:00+00:00').add(
    casual.integer(0, 120),
    'minutes'
  );
  orderSets.forEach(orderSet => {
    let name = sample(statusList);
    if (orderSet.interna_note === 'upcoming_order_set') {
      name = 'PAYMENT_SUCCESS';
    }
    orderStatuses.push({
      id: casual.uuid,
      name,
      order_type: 'ORDER_SET',
      created_at: createdAt.toISOString(),
      reference_order_id: orderSet.id,
      raw_response: { ref: casual.uuid },
    });
    createdAt = createdAt.add(casual.integer(10, 20), 'minutes');
  });

  return orderStatuses;
};
