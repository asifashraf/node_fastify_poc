exports.up = knex =>
  knex.schema.createTable('menu_item_options', table => {
    table.uuid('id').primary();
    table.string('value').notNullable();
    table
      .specificType('price', 'numeric(13, 3)')
      .default(0)
      .notNullable();
    table
      .uuid('nutritional_info_id')
      .references('id')
      .inTable('nutritional_info')
      .index()
      .notNullable();
  });

exports.down = knex => knex.schema.dropTable('menu_item_options');
