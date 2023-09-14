exports.up = knex =>
  knex.schema.table('menu_item_options', table => {
    table.dropColumn('nutritional_info_id');
  });

exports.down = knex =>
  knex.schema.table('menu_item_options', table => {
    table
      .uuid('nutritional_info_id')
      .references('id')
      .inTable('nutritional_info')
      .index()
      .notNullable();
  });
