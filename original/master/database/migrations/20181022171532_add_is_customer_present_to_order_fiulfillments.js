exports.up = knex =>
  knex.schema.table('order_fulfillment', table =>
    table
      .boolean('is_customer_present')
      .default(false)
      .notNullable()
  );

exports.down = knex =>
  knex.schema.table('order_fulfillment', table =>
    table.dropColumn('is_customer_present')
  );
