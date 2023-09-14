exports.up = knex =>
  knex.schema.table('order_items', table => {
    table
      .uuid('order_id')
      .references('id')
      .inTable('orders')
      .notNullable();
  });

exports.down = knex =>
  knex.schema.table('order_items', table => {
    table.dropColumn('order_id');
  });
