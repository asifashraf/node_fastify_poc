exports.up = knex =>
  knex.schema.table('order_items', table =>
    table.boolean('refunded').default(false)
  );

exports.down = knex =>
  knex.schema.table('order_items', table => table.dropColumn('refunded'));
