exports.up = async knex => {
  await knex.schema.table('loyalty_transactions', table => {
    table.index('reference_order_id', 'idx-loyalty_transactions-reference_order_id');
  });
};

exports.down = async knex => {
  await knex.schema.table('loyalty_transactions', table => {
    table.dropIndex('reference_order_id', 'idx-loyalty_transactions-reference_order_id');
  });
};
