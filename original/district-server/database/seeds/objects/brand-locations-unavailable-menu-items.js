/* eslint-disable camelcase */
const casual = require('casual');
const { forEach } = require('lodash');
const { sampleSize } = require('../utils.js');

module.exports = (brandLocations, menuItems) => {
  const unavailableItems = [];

  forEach(brandLocations, brandLocation => {
    const sampledMenuItems = sampleSize(menuItems, casual.integer(0, 2));
    sampledMenuItems.forEach(menuItem => {
      unavailableItems.push({
        menu_item_id: menuItem.id,
        brand_location_id: brandLocation.id,
      });
    });
  });
  return unavailableItems;
};
