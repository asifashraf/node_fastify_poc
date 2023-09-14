const casual = require('casual');
const { times } = require('lodash');
const { dateAfterDate } = require('../utils');

/* eslint-disable camelcase */

const newNotification = () => {
  const dateCreated = dateAfterDate(
    '2017-01-01',
    casual.integer(1, 10),
    'months'
  );
  const embargoDate = dateAfterDate(dateCreated, casual.integer(1, 15), 'days');
  return {
    id: casual.uuid,
    date_created: dateCreated,
    customer_id: null,
    medium: 'push',
    embargo_date: embargoDate,
    status: 'delivered',
  };
};

module.exports = () => {
  return times(3, newNotification);
};
