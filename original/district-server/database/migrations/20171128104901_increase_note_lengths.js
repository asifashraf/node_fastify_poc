exports.up = knex =>
  knex.schema
    .alterTable('order_fulfillment', table => {
      table.string('note', 4096).alter();
    })
    .alterTable('order_items', table => {
      table.string('note', 4096).alter();
    })
    .alterTable('order_sets', table => {
      table.string('note', 4096).alter();
    })
    .alterTable('order_statuses', table => {
      table.string('note', 4096).alter();
    })
    .table('addresses', table => {
      table.string('note', 4096);
    })
    .table('delivery_addresses', table => {
      table.string('note', 4096);
    });

exports.down = knex =>
  knex.schema
    .alterTable('order_fulfillment', table => {
      table.string('note').alter();
    })
    .alterTable('order_items', table => {
      table.string('note').alter();
    })
    .alterTable('order_sets', table => {
      table.string('note').alter();
    })
    .alterTable('order_statuses', table => {
      table.string('note').alter();
    })
    .table('addresses', table => {
      table.dropColumn('note');
    })
    .table('delivery_addresses', table => {
      table.dropColumn('note');
    });
