exports.up = knex =>
  knex.schema.createTable('order_items', table => {
    table.uuid('id').primary();
    table.integer('quantity').notNullable();
    table
      .uuid('menu_item_id')
      .references('id')
      .inTable('menu_items')
      .notNullable();
    table.string('note');
  });

exports.down = knex => knex.schema.dropTable('order_items');
