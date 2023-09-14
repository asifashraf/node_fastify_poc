exports.up = knex =>
  knex.schema.table('gift_card_orders', table => {
    table.renameColumn('payment_service', 'payment_provider');
  });

exports.down = knex =>
  knex.schema.alterTable('gift_card_orders', table => {
    table.renameColumn('payment_provider', 'payment_service');
  });
