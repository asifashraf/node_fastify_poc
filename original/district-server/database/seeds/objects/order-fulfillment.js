/* eslint-disable camelcase */
const casual = require('casual');
const { dateAfterDate, sample } = require('../utils.js');

module.exports = orderSets => {
  const orderFulfilment = [];

  orderSets.forEach(orderSet => {
    const time = dateAfterDate(
      '2017-11-01T08:00Z',
      casual.integer(1, 720),
      'minutes'
    );
    const type = sample(['PICKUP', 'DELIVERY']);

    const deliver_to_vehicle = type === 'PICKUP' ? casual.coin_flip : false;
    const asap = deliver_to_vehicle;
    const vehicle_color = deliver_to_vehicle ? casual.color_name : null;
    const vehicle_description = deliver_to_vehicle
      ? sample(['Ferrari', 'Fiat', 'Lamborghini', 'Audi', 'DeLorean'])
      : null;

    orderFulfilment.push({
      id: casual.uuid,
      type,
      time,
      note: casual.text,
      order_set_id: orderSet.id,
      deliver_to_vehicle,
      vehicle_color,
      vehicle_description,
      asap,
    });
  });

  return orderFulfilment;
};
