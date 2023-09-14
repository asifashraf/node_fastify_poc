exports.up = knex =>
  knex.schema.table('order_fulfillment', table => {
    table.integer('courier_order_id').default(0);
    table.string('delivery_status');
    table.datetime('last_updated');
    table.datetime('delivered_at');
  });

exports.down = knex =>
  knex.schema.table('order_fulfillment', table => {
    table.dropColumn('courier_order_id');
    table.dropColumn('delivery_status');
    table.dropColumn('last_updated');
    table.dropColumn('delivered_at');
  });
