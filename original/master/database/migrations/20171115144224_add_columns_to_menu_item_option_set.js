exports.up = knex =>
  knex.schema.table('menu_item_option_sets', table => {
    table
      .uuid('menu_item_id')
      .references('id')
      .inTable('menu_items')
      .notNullable();
  });

exports.down = knex =>
  knex.schema.table('menu_item_option_sets', table => {
    table.dropColumn('menu_item_id');
  });
