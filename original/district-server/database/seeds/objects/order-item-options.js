/* eslint-disable camelcase */
const casual = require('casual');
const { sample } = require('../utils.js');

module.exports = (menuItemOptions, orderItems) => {
  const orderItemOptions = [];

  orderItems.forEach(orderItem => {
    const menuItemOption = sample(menuItemOptions);
    orderItemOptions.push({
      id: casual.uuid,
      menu_item_option_id: menuItemOption.id,
      value: menuItemOption.value,
      value_ar: menuItemOption.value_ar,
      price: menuItemOption.price,
      order_item_id: orderItem.id,
    });
  });

  return orderItemOptions;
};
