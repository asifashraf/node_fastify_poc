exports.up = knex =>
  knex.schema.alterTable('gift_card_orders', table => {
    table.string('receipt_url');
    table.string('error_url');
    table.string('payment_service');
    table.string('merchant_id');
  });

exports.down = knex =>
  knex.schema.table('gift_card_orders', table => {
    table.dropColumn('receipt_url');
    table.dropColumn('error_url');
    table.dropColumn('payment_service');
    table.dropColumn('merchant_id');
  });
