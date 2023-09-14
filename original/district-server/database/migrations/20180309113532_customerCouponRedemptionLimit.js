exports.up = knex =>
  knex.schema.table('coupons', table => {
    table
      .integer('customer_redemption_limit')
      .notNullable()
      .default(1);
  });

exports.down = knex =>
  knex.schema.table('coupons', table => {
    table.dropColumn('customer_redemption_limit');
  });
