exports.up = async knex => {
  await knex.schema.table('order_item_options', table => {
    table.index('order_item_id', 'idx-order_item_options-order_item_id');
  });
};

exports.down = async knex => {
  await knex.schema.table('order_item_options', table => {
    table.dropIndex('order_item_id', 'idx-order_item_options-order_item_id');
  });
};
