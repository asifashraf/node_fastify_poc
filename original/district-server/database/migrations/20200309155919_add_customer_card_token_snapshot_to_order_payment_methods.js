exports.up = knex =>
  knex.schema.alterTable('order_payment_methods', table => {
    table.jsonb('customer_card_token_snapshot');
  });

exports.down = knex =>
  knex.schema.table('order_payment_methods', table => {
    table.dropColumn('customer_card_token_snapshot');
  });
