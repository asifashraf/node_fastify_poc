exports.up = async knex => {
  await knex.schema.table('gift_card_transactions', table => {
    table.index(
      'reference_order_id',
      'idx-gift_card_transactions12-reference_order_id'
    );
    table.index('order_type', 'idx-gift_card_transactions12-order_type');
  });
};

exports.down = async knex => {
  await knex.schema.table('gift_card_transactions', table => {
    table.dropIndex(
      'reference_order_id',
      'idx-gift_card_transactions12-reference_order_id'
    );
    table.dropIndex('order_type', 'idx-gift_card_transactions12-order_type');
  });
};
