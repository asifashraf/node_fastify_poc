exports.up = function(knex) {
  return knex.schema.table('brands_coupons', function(table) {
    table.unique(['brand_id', 'coupon_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.table('brands_coupons', function(table) {
    table.dropUnique(['brand_id', 'coupon_id']);
  });
};
