/* eslint-disable camelcase */
const casual = require('casual');
const { forEach } = require('lodash');
const { sampleSize } = require('../utils.js');

module.exports = (brands, coupons) => {
  const relations = [];

  forEach(brands, brand => {
    sampleSize(coupons, casual.integer(1, coupons.length)).forEach(coupon => {
      relations.push({
        coupon_id: coupon.id,
        brand_id: brand.id,
      });
    });
  });
  return relations;
};
