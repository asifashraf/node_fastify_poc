/* eslint-disable camelcase */
const casual = require('casual');
const { forEach } = require('lodash');
const { sampleSize } = require('../utils.js');

module.exports = (brandLocations, coupons) => {
  const relations = [];

  forEach(brandLocations, brandLocation => {
    sampleSize(coupons, casual.integer(1, coupons.length)).forEach(coupon => {
      relations.push({
        coupon_id: coupon.id,
        brand_location_id: brandLocation.id,
      });
    });
  });
  return relations;
};
