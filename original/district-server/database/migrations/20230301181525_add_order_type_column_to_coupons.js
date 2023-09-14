exports.up = function(knex) {
  return knex.schema.alterTable('coupons', (table) => {
    table.enu('order_type', ['REGULAR_ORDER', 'SUBSCRIPTION_ORDER'], {
      useNative: true,
      enumName: 'coupon_order_type_enum',
    }).defaultTo('REGULAR_ORDER');
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('coupons', (table) => {
    table.dropColumn('order_type');
  });
};
