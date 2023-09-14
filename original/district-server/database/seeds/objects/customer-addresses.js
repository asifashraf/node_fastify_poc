/* eslint-disable camelcase */
const { extend } = require('lodash');
const casual = require('casual');

module.exports = (customers, neigborhoods, knex) => {
  const addresses = [
    {
      friendly_name: 'Home',
      note: 'This is my house, There are many like it, but this one is mine.',
      is_default: true,
      block: '14B',
      street: 'Main Street',
      avenue: '11th Avenue',
      neighborhood_id: neigborhoods[0].id,
      street_number: '123',
      type: 'APARTMENT',
      floor: '14',
      unit_number: '14',
      geolocation: knex.raw(
        `ST_GeomFromText('POINT(47.990362600000026 29.3774796)', 4326)`
      ),
      dynamic_data: {
        'cc451fc7-6585-4bdd-bcab-c32b20568924': 'my nickname 1',
        '141afd5c-b04e-47cc-b67b-b6b57ac3702c': 'my details 1',
      },
    },
    {
      friendly_name: 'Work',
      note: 'the office',
      is_default: false,
      block: '',
      street: 'Elm',
      avenue: '',
      neighborhood_id: neigborhoods[1].id,
      street_number: '1024',
      type: 'HOUSE',
      floor: '',
      unit_number: '',
      geolocation: knex.raw(
        `ST_GeomFromText('POINT(44.990362600000026 32.3774796)', 4326)`
      ),
      dynamic_data: {
        'cc451fc7-6585-4bdd-bcab-c32b20568924': 'my nickname 2',
        '141afd5c-b04e-47cc-b67b-b6b57ac3702c': 'my details 2',
      },
    },
  ];

  const customerAddresses = [];

  customers.forEach(customer => {
    // index 0 = default_address_id, index 1 = another address id
    const defaultAddress = addresses[0];
    const anotherAddress = addresses[1];

    customerAddresses.push(
      extend({}, defaultAddress, { customer_id: customer.id, id: casual.uuid })
    );
    customerAddresses.push(
      extend({}, anotherAddress, { customer_id: customer.id, id: casual.uuid })
    );
  });

  return customerAddresses;
};
