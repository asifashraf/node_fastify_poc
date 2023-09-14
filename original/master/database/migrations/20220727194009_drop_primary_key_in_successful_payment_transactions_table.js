
exports.up = function(knex) {
  return knex.schema.alterTable('successful_payment_transactions', table => {
    table.dropColumn('order_id');
    table
      .uuid('reference_order_id')
      .index();
    table.unique(['reference_order_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('successful_payment_transactions', table => {
    table.dropColumn('reference_order_id');
    table
      .uuid('order_id')
      .references('id')
      .inTable('order_sets')
      .index();
    table.unique(['order_id']);
  });
};
