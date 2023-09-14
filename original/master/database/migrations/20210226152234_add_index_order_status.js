exports.up = async knex => {
  await knex.schema.table('order_set_statuses', table => {
    table.index('status', 'idx-order_set_statuses12-status');
  });
};

exports.down = async knex => {
  await knex.schema.table('order_set_statuses', table => {
    table.dropIndex('status', 'idx-order_set_statuses12-status');
  });
};
