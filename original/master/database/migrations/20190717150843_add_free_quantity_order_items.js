exports.up = knex =>
  knex.schema.table('order_items', table => {
    table.integer('free_quantity').default(0);
  });

exports.down = knex =>
  knex.schema.table('order_items', table => {
    table.dropColumn('free_quantity');
  });
