/* eslint-disable camelcase */
const casual = require('casual');
const times = require('lodash/times');
const moment = require('moment');

module.exports = orderSets => {
  const orderComments = [];

  orderSets.forEach(orderSet => {
    const numberOfComments = casual.integer(1, 3);
    times(numberOfComments, () => {
      orderComments.push({
        id: casual.uuid,
        comment: casual.sentence,
        created: moment('2018-01-05T12:00:00+01:00').toISOString(),
        order_set_id: orderSet.id,
        user_name: casual.name,
        avatar:
          'https://cdn5.vectorstock.com/i/thumb-large/82/59/anonymous-user-flat-icon-vector-18958259.jpg',
      });
    });
  });

  return orderComments;
};
