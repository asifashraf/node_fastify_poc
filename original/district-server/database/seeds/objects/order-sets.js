/* eslint-disable camelcase */
const casual = require('casual');
const times = require('lodash/times');
const { dateAfterDate, sample } = require('../utils.js');

module.exports = (customers, brandLocations, coupons) => {
  const orderSets = [];
  const startDate = dateAfterDate('2017-10-01 14:14:14', 1);

  // See `generateShortCode()` in `../../../src/lib/util.js`
  const shortCodes = [
    '7PWV7W',
    'VE21TV',
    '4DTXPG',
    'MD60NJ',
    'YXKFGT',
    'WG2DNU',
    '3FTAT',
    'FLX1D2',
    '5YLHHD',
    'LT6TD2',
    'JJJTHX',
    'CTCDDN',
    'JRU6NA',
    'NAEXDL',
    'C68J8R',
    '76C4F0',
    'N48PHE',
    'VMTDGW',
    'VTYHJ6',
    'J0TFYJ',
    '2XUHHD',
    'JE6D4F',
    'CTPHKW',
    'RAEDH6L',
  ];

  // ===========================================================================
  // ===========================================================================
  // ===========================================================================
  // ===========================================================================
  // ===========================================================================

  const generatePrice = () => {
    const wholeDinars = casual.integer(0, 2);
    const fractions = [0.25, 0.5, 0.75];
    const fraction = sample(fractions);
    return wholeDinars + fraction;
  };

  customers.forEach((customer, ix) => {
    times(3, daysToAdd => {
      const couponObj = sample(coupons);
      const subtotal = generatePrice();
      const createdAt = dateAfterDate(startDate, daysToAdd, 'days');
      const fee = sample([0.25, 0.5, 0.75]);
      let couponAmount = 0;
      let couponId = null;
      if (casual.coin_flip) {
        couponId = couponObj.id;
        couponAmount =
          couponObj.flat_amount === null
            ? subtotal * (couponObj.percentage / 100)
            : couponObj.flat_amount;
      }
      const total = (subtotal + fee - couponAmount).toFixed(3);

      orderSets.push({
        id: casual.uuid,
        customer_id: customer.id,
        note: casual.sentence,
        internal_note: casual.coin_flip ? casual.sentence : null,
        subtotal: subtotal.toFixed(3),
        total,
        fee,
        coupon_amount: couponAmount,
        coupon_id: couponId,
        brand_location_id: sample(brandLocations).id,
        created_at: createdAt,
        short_code: sample(shortCodes),
        merchant_id: casual.uuid,
        paid: true,
        currency_id: 'f216d955-0df1-475d-a9ec-08cb6c0f92bb',
      });
    });

    // Add more order sets to tag them as "upcoming"
    if (ix === 0) {
      times(2, daysToAdd => {
        const couponObj = sample(coupons);
        const subtotal = generatePrice();
        const createdAt = dateAfterDate(startDate, daysToAdd, 'days');
        const fee = sample([0.25, 0.5, 0.75]);
        let couponAmount = 0;
        let couponId = null;
        if (casual.coin_flip) {
          couponId = couponObj.id;
          couponAmount =
            couponObj.flat_amount === null
              ? subtotal * (couponObj.percentage / 100)
              : couponObj.flat_amount;
        }
        const total = (subtotal + fee - couponAmount).toFixed(3);

        orderSets.push({
          id: casual.uuid,
          customer_id: customer.id,
          note: casual.sentence,
          internal_note: 'upcoming_order_set',
          subtotal: subtotal.toFixed(3),
          total,
          fee,
          coupon_amount: couponAmount,
          coupon_id: couponId,
          brand_location_id: sample(brandLocations).id,
          created_at: createdAt,
          short_code: sample(shortCodes),
          merchant_id: casual.uuid,
          paid: true,
          currency_id: 'f216d955-0df1-475d-a9ec-08cb6c0f92bb',
        });
      });
    }
  });

  return orderSets;
};
