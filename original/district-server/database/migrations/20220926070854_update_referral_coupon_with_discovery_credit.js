exports.up = function(knex) {
  return knex.schema.raw(
    'UPDATE coupons SET with_discovery_credit = true WHERE referral_coupon = true AND with_discovery_credit = false;'
  );
};

exports.down = async function(knex) {
  return knex.schema.raw(
    'UPDATE coupons SET with_discovery_credit = false WHERE referral_coupon = true AND with_discovery_credit = true;'
  );
};
