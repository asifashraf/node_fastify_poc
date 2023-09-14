/* eslint-disable camelcase */
const casual = require('casual');
const { sample } = require('../utils.js');
const times = require('lodash/times');

module.exports = (menuItems, orderSets) => {
  const orderItems = [];

  orderSets.forEach(orderSet => {
    const numberOfOrders = casual.integer(1, 3);
    times(numberOfOrders, () => {
      const menuItem = sample(menuItems);
      orderItems.push({
        id: casual.uuid,
        name: menuItem.name,
        name_ar: menuItem.name_ar,
        quantity: casual.integer(1, 2),
        price: sample([0.25, 0.5, 0.75]),
        menu_item_id: menuItem.id,
        note: casual.coin_flip ? casual.sentence : null,
        order_set_id: orderSet.id,
      });
    });
  });

  return orderItems;
};
