exports.up = knex =>
  knex.schema.createTable('order_item_options', table => {
    table.uuid('id').primary();
    table.string('value').notNullable();
    table.specificType('price', 'numeric(13, 3)').notNullable();
    table
      .uuid('menu_item_option_id')
      .references('id')
      .inTable('menu_item_options')
      .notNullable();
  });

exports.down = knex => knex.schema.dropTable('order_item_options');
