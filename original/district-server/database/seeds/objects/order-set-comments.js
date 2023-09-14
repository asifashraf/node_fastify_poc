/* eslint-disable camelcase */
const casual = require('casual');
const moment = require('moment');
const { forEach } = require('lodash');
const { sample } = require('../utils.js');
const { orderSetCommentTypes } = require('../../../src/schema/root/enums');

module.exports = orderSets => {
  const orderSetComments = [];
  forEach(orderSets, orderSet => {
    const type = sample(orderSetCommentTypes);

    orderSetComments.push({
      id: casual.uuid,
      order_set_id: orderSet.id,
      type,
      user_id: casual.uuid,
      user_name: casual.name,
      user_email: casual.email,
      comment: casual.text,
      created_at: moment('2018-01-05T12:00:00+01:00').toISOString(),
    });
  });

  return orderSetComments;
};
