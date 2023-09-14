exports.up = knex =>
  knex.schema.table('order_item_options', table => {
    table
      .uuid('order_item_id')
      .references('id')
      .inTable('order_items');
  });

exports.down = knex =>
  knex.schema.table('order_item_options', table => {
    table.dropColumn('order_item_id');
  });
