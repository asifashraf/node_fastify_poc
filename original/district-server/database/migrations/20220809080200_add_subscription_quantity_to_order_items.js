exports.up = knex =>
  knex.schema.table('order_items', table => {
    table.integer('subscription_quantity').default(0);
  });

exports.down = knex =>
  knex.schema.table('order_items', table => {
    table.dropColumn('subscription_quantity');
  });
