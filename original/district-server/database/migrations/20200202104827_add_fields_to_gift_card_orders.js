exports.up = knex =>
  knex.schema.alterTable('gift_card_orders', table => {
    table.string('receiver_name');
    table.string('message');
  });

exports.down = knex =>
  knex.schema.table('gift_card_orders', table => {
    table.dropColumn('receiver_name');
    table.dropColumn('message');
  });
