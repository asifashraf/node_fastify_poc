/* eslint-disable camelcase */
const casual = require('casual');
const moment = require('moment');

module.exports = brandLocations => {
  return [
    // costa1 closed all day Monday the 4th
    {
      id: casual.uuid,
      brand_location_id: brandLocations.costa1.id,
      start_time: moment('2017-12-04T06:00:00+03:00').toISOString(),
      end_time: moment('2017-12-04T14:00:00+03:00').toISOString(),
      is_closed: true,
      is_delivery_closed: true,
    },

    // costa1 closes early Tuesday the 5th
    {
      id: casual.uuid,
      brand_location_id: brandLocations.costa1.id,
      start_time: moment('2017-12-05T12:00:00+03:00').toISOString(),
      end_time: moment('2017-12-05T14:00:00+03:00').toISOString(),
      is_closed: true,
      is_delivery_closed: true,
    },

    // costa1 opens late Wednesday the 6th
    {
      id: casual.uuid,
      brand_location_id: brandLocations.costa1.id,
      start_time: moment('2017-12-06T06:00:00+03:00').toISOString(),
      end_time: moment('2017-12-06T08:00:00+03:00').toISOString(),
      is_closed: true,
      is_delivery_closed: true,
    },

    // costa1 closes mid-day Thursday the 7th
    {
      id: casual.uuid,
      brand_location_id: brandLocations.costa1.id,
      start_time: moment('2017-12-07T10:00:00+03:00').toISOString(),
      end_time: moment('2017-12-07T12:00:00+03:00').toISOString(),
      is_closed: true,
      is_delivery_closed: true,
    },

    // costa1 stays open later Friday the 8th
    {
      id: casual.uuid,
      brand_location_id: brandLocations.costa1.id,
      start_time: moment('2017-12-08T14:00:00+03:00').toISOString(),
      end_time: moment('2017-12-08T16:00:00+03:00').toISOString(),
      is_closed: false,
      is_delivery_closed: false,
    },

    // starbucks3 closed all day Monday the 4th
    {
      id: casual.uuid,
      brand_location_id: brandLocations.starbucks3.id,
      start_time: moment('2017-12-04T00:00:00+03:00').toISOString(),
      end_time: moment('2017-12-04T23:59:59+03:00').toISOString(),
      is_closed: true,
      is_delivery_closed: true,
    },

    // starbucks3 closes at noon Tuesday the 5th
    {
      id: casual.uuid,
      brand_location_id: brandLocations.starbucks3.id,
      start_time: moment('2017-12-05T12:00:00+03:00').toISOString(),
      end_time: moment('2017-12-05T23:59:59+03:00').toISOString(),
      is_closed: true,
      is_delivery_closed: true,
    },

    // starbucks3 opens at noon Wednesday the 6th
    {
      id: casual.uuid,
      brand_location_id: brandLocations.starbucks3.id,
      start_time: moment('2017-12-06T00:00:00+03:00').toISOString(),
      end_time: moment('2017-12-06T12:00:00+03:00').toISOString(),
      is_closed: true,
      is_delivery_closed: true,
    },

    // starbucks3 closes mid-day Thursday the 7th
    {
      id: casual.uuid,
      brand_location_id: brandLocations.starbucks3.id,
      start_time: moment('2017-12-07T12:00:00+03:00').toISOString(),
      end_time: moment('2017-12-07T14:00:00+03:00').toISOString(),
      is_closed: true,
      is_delivery_closed: true,
    },

    // starbucks3 closed from Sunday the 11th through Saturday the 17th
    {
      id: casual.uuid,
      brand_location_id: brandLocations.starbucks3.id,
      start_time: moment('2017-12-11T00:00:00+03:00').toISOString(),
      end_time: moment('2017-12-17T23:59:59+03:00').toISOString(),
      is_closed: true,
      is_delivery_closed: true,
    },
  ];
};
