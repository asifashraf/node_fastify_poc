exports.up = knex =>
  knex.schema.table('menu_sections', table => {
    table
      .uuid('menu_id')
      .references('id')
      .inTable('menus')
      .notNullable();
  });

exports.down = knex =>
  knex.schema.table('menu_sections', table => {
    table.dropColumn('menu_id');
  });
