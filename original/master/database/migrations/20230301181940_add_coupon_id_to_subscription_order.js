exports.up = function(knex) {
  return knex.schema.alterTable('subscription_orders', (table) => {
    table.uuid('coupon_id').references('id').inTable('coupons').nullable().index();
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('subscription_orders', (table) => {
    table.dropColumn('coupon_id');
  });
};
