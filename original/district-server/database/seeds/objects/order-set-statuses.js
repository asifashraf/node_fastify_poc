/* eslint-disable camelcase */
const casual = require('casual');
const { forEach } = require('lodash');
const { sample } = require('../utils.js');

module.exports = orderSets => {
  const availableStatuses = [
    'PLACED',
    'ACCEPTED',
    'REJECTED',
    'PREPARING',
    'PREPARED',
    'COMPLETED',
  ];

  const orderSetStatuses = [];
  forEach(orderSets, orderSet => {
    const status = sample(availableStatuses);

    orderSetStatuses.push({
      id: casual.uuid,
      order_set_id: orderSet.id,
      status:
        orderSet.internal_note === 'upcoming_order_set' ? 'COMPLETED' : status,
      rejection_reason: status === 'REJECTED' ? 'OUT_OF_STOCK' : null,
      note: casual.coin_flip ? casual.sentence : null,
    });
  });

  return orderSetStatuses;
};
