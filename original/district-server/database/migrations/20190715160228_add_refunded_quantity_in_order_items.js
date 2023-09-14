exports.up = knex =>
  knex.schema.table('order_items', table => {
    table.integer('refunded_quantity').default(0);
  });

exports.down = knex =>
  knex.schema.table('order_items', table => {
    table.dropColumn('refunded_quantity');
  });
