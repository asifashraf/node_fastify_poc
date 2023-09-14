exports.up = knex =>
  knex.schema.table('menu_item_options', table => {
    table
      .uuid('menu_item_option_set_id')
      .references('id')
      .inTable('menu_item_option_sets')
      .notNullable();
  });

exports.down = knex =>
  knex.schema.table('menu_item_options', table => {
    table.dropColumn('menu_item_option_set_id');
  });
