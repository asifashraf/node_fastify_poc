/* eslint-disable camelcase */
const casual = require('casual');

const { couponType } = require('../../../src/schema/root/enums');

module.exports = coupons => {
  const couponDetails = [];

  coupons.map(coupon => {
    let type = null;
    let amount = null;
    if (coupon.flat_amount) {
      type = couponType.FLAT_AMOUNT;
      amount = coupon.flat_amount;
    } else {
      type = couponType.PERCENTAGE;
      amount = coupon.percentage;
    }
    couponDetails.push({
      id: casual.uuid,
      type,
      coupon_id: coupon.id,
      amount,
    });
    return coupon;
  });

  return couponDetails;
};
