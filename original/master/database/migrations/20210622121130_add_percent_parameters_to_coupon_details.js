exports.up = function(knex) {
  return knex.schema.table('coupon_details', table => {
    table
      .integer('percent_paid_by_cofe')
      .notNullable()
      .default(0);
    table
      .integer('percent_paid_by_vendor')
      .notNullable()
      .default(100);
  });
};

exports.down = function(knex) {
  return knex.schema.table('coupon_details', table => {
    table.dropColumn('percent_paid_by_cofe');
    table.dropColumn('percent_paid_by_vendor');
  });
};
