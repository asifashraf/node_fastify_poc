exports.up = knex =>
  knex.schema.table('order_fulfillment', table => {
    table
      .uuid('address_id')
      .references('id')
      .inTable('addresses')
      .notNullable();
    table
      .uuid('order_id')
      .references('id')
      .inTable('orders')
      .notNullable();
  });

exports.down = knex =>
  knex.schema.table('order_fulfillment', table => {
    table.dropColumn('address_id');
    table.dropColumn('order_id');
  });
