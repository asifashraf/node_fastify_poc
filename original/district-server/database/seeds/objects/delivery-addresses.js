/* eslint-disable camelcase */
const casual = require('casual');
const { values, filter, extend, omit } = require('lodash');
const { sample } = require('../utils');

module.exports = (orderFulfillments, customerAddresses, neighborhoods) => {
  const deliveryAddresses = [];
  const customerAddressArray = values(customerAddresses);

  orderFulfillments.forEach(orderFulfillment => {
    const address = sample(customerAddressArray);
    const neighborhood = filter(neighborhoods, { id: address.neighborhood_id });

    const deliveryAddress = extend(
      {},
      omit(address, ['customer_id', 'is_default', 'neighborhood_id']),
      {
        id: casual.uuid,
        order_fulfillment_id: orderFulfillment.id,
        neighborhood_name: neighborhood[0].name,
      }
    );

    deliveryAddresses.push(deliveryAddress);
  });

  return deliveryAddresses;
};
