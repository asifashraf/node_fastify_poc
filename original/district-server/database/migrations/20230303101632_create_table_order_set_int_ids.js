
exports.up = function(knex) {
  return knex.schema.createTable('order_set_int_ids', (table) => {
    table.bigIncrements('id').primary().index();
    table.string('order_set_id', 128).index();
    table.string('order_set_shortcode', 64).index();
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('order_set_int_ids');
};
