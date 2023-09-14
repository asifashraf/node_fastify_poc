exports.up = knex =>
  knex.schema.alterTable('gift_card_transactions', table => {
    table.dropUnique('reference_order_id');
  });

exports.down = knex =>
  knex.schema.table('gift_card_transactions', table => {
    table.unique('reference_order_id');
  });
