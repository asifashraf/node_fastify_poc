
exports.up = function(knex) {
  return knex.schema.createTable('successful_payment_transactions', table => {
    table
      .uuid('order_id')
      .references('id')
      .inTable('order_sets')
      .index();
    table
      .timestamp('created_at')
      .notNullable()
      .defaultTo(knex.fn.now());
    table.unique(['order_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('successful_payment_transactions');
};
