exports.up = knex =>
  knex.schema.alterTable('store_order_products', table => {
    table
      .boolean('refunded')
      .nullable()
      .default(false);
    table.integer('refunded_quantity').default(0);
  });

exports.down = knex =>
  knex.schema.alterTable('store_order_products', table => {
    table.dropColumn('refunded');
    table.dropColumn('refunded_quantity');
  });
