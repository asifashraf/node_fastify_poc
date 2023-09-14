exports.up = knex =>
  knex.schema.table('orders', table => {
    table
      .string('customer_id')
      .references('id')
      .inTable('customers')
      .index()
      .notNullable();
    table
      .uuid('order_set_id')
      .references('id')
      .inTable('order_sets')
      .index()
      .notNullable();
  });

exports.down = knex =>
  knex.schema.table('orders', table => {
    table.dropColumn('customer_id');
    table.dropColumn('order_set_id');
  });
