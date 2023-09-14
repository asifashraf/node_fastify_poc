exports.up = knex =>
  knex.schema.alterTable('coupons', table => {
    table.boolean('referral_coupon').defaultTo(false);
  });

exports.down = knex =>
  knex.schema.alterTable('coupons', table => {
    table.dropColumn('referral_coupon');
  });
