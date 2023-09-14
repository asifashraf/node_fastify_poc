exports.up = knex =>
  knex.schema.table('loyalty_orders', table => {
    table.renameColumn('payment_service', 'payment_provider');
  });

exports.down = knex =>
  knex.schema.alterTable('loyalty_orders', table => {
    table.renameColumn('payment_provider', 'payment_service');
  });