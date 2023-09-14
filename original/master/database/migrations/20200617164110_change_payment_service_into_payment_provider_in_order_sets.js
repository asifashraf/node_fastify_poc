exports.up = knex =>
  knex.schema.table('order_sets', table => {
    table.renameColumn('payment_service', 'payment_provider');
  });

exports.down = knex =>
  knex.schema.alterTable('order_sets', table => {
    table.renameColumn('payment_provider', 'payment_service');
  });
