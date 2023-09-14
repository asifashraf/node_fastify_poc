exports.up = knex =>
  knex.schema.table('transactions', table => {
    table.dropColumn('order_set_id');
    table.uuid('reference_order_id').index();
    table
      .string('order_type', 32)
      .default('ORDER_SET')
      .index();
  });

exports.down = knex =>
  knex.schema.table('transactions', table => {
    table.dropColumn('reference_order_id');
    table.dropColumn('order_type');
    table
      .uuid('order_set_id')
      .references('id')
      .inTable('order_sets')
      .index();
  });
