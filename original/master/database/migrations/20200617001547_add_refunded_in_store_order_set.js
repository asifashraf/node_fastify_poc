exports.up = knex =>
  knex.schema.table('store_order_sets', table =>
    table.boolean('refunded').default(false)
  );

exports.down = knex =>
  knex.schema.table('store_order_sets', table => table.dropColumn('refunded'));
