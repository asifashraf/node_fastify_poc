exports.up = knex =>
  knex.schema.table('store_order_products', table => {
    table
      .boolean('refunded')
      .notNullable()
      .defaultTo(false)
      .alter();
    table
      .integer('refunded_quantity')
      .notNullable()
      .defaultTo(0)
      .alter();
  });

exports.down = knex =>
  knex.schema.table('store_order_products', table => {
    table
      .boolean('refunded')
      .nullable()
      .defaultTo(false)
      .alter();
    table
      .integer('refunded_quantity')
      .nullable()
      .defaultTo(0)
      .alter();
  });
