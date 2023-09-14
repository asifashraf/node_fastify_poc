/* eslint-disable camelcase */
const { sampleSize } = require('../utils.js');
const casual = require('casual');

module.exports = (customers, coupons) => {
  const relations = [];

  customers.forEach(customer => {
    const sampledCoupons = sampleSize(coupons, casual.integer(1, 3));

    sampledCoupons.forEach(coupon => {
      relations.push({
        coupon_id: coupon.id,
        customer_id: customer.id,
      });
    });
  });

  return relations;
};
