/* eslint-disable camelcase */
const casual = require('casual');
const { times, random } = require('lodash');
const moment = require('moment');
const { dateAfterDate, sample } = require('../utils.js');

module.exports = () => {
  const coupons = [];

  times(5, ix => {
    let flatAmount = null;
    let percentage = null;
    if (casual.coin_flip) {
      const wholeDinars = casual.integer(0, 2);
      const fractions = [0.25, 0.5, 0.75];
      const fraction = sample(fractions);
      flatAmount = (wholeDinars + fraction).toFixed(3);
    } else {
      percentage = casual.integer(5, 80);
    }

    const createdAt = moment('2017-09-01T12:00:00+01:00').toISOString();
    const startDate = moment('2017-09-01T12:00:00+01:00').toISOString();
    const endDate = dateAfterDate(startDate, 100, 'years');
    const maxLimit = casual.integer(0, 50);
    const minApplicableLimit = random(0, 5);
    const redemptionLimit = casual.integer(0, 120);
    const redemptionCount = casual.integer(0, redemptionLimit);
    const isValid = casual.boolean;
    const status = isValid ? 'ACTIVE' : 'INACTIVE';

    coupons.push({
      id: casual.uuid,
      code: casual.color_name.toUpperCase(),
      flat_amount: flatAmount,
      percentage,
      created_at: createdAt,
      start_date: startDate,
      end_date: endDate,
      is_valid: isValid,
      status,
      max_limit: maxLimit,
      min_applicable_limit: minApplicableLimit,
      redemption_limit: redemptionLimit,
      redemption_count: redemptionCount,
      hero_photo: `https://cofe-district.imgix.net/coupons/seed/coupon${ix}.jpg`,
      description:
        '1 Free Coffee when you Cultivar, bar a so grinder a macchiato beans. Cultivar cup irish, caffeine, dripper coffee, redeye saucer cappuccino sit macchiato.',
      customer_redemption_limit: 1,
      country_id: '01c73b60-2c6a-45f1-8dbf-88a5ce4ad179',
    });
  });

  // Seed coupon with restricted allowed payment methods
  coupons.push({
    id: casual.uuid,
    code: 'CASHORAPPLEPAY2020',
    flat_amount: null,
    percentage: 6,
    created_at: moment('2020-11-01T12:00:00+01:00').toISOString(),
    start_date: moment('2020-11-01T12:00:00+01:00').toISOString(),
    end_date: moment('2120-11-01T12:00:00+01:00').toISOString(),
    is_valid: true,
    status: 'ACTIVE',
    max_limit: 48,
    min_applicable_limit: 5,
    redemption_limit: 29,
    redemption_count: 25,
    hero_photo: `https://cofe-district.imgix.net/coupons/seed/coupon${6}.jpg`,
    description:
      '1 Free Coffee when you Cultivar, bar a so grinder a macchiato beans. Cultivar cup irish, caffeine, dripper coffee, redeye saucer cappuccino sit macchiato.',
    customer_redemption_limit: 1,
    country_id: '01c73b60-2c6a-45f1-8dbf-88a5ce4ad179',
    allowed_payment_methods: ['APPLE_PAY', 'CASH'],
  });

  // Want to keep the same codes
  return coupons;
};
