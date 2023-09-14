exports.up = knex =>
  knex.schema.table('order_sets', table =>
    table.boolean('refunded').default(false)
  );

exports.down = knex =>
  knex.schema.table('order_sets', table => table.dropColumn('refunded'));
