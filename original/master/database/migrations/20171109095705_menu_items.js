exports.up = knex =>
  knex.schema.createTable('menu_items', table => {
    table.uuid('id').primary();
    table.string('name').notNullable();
    table.specificType('base_price', 'numeric(13, 3)');
    table
      .uuid('base_nutritional_id')
      .references('id')
      .inTable('nutritional_info')
      .index()
      .notNullable();
    table.string('photo');
  });

exports.down = knex => knex.schema.dropTable('menu_items');
