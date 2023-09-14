exports.up = knex =>
  knex.schema.table('menu_items', table => {
    table
      .uuid('section_id')
      .references('id')
      .inTable('menu_sections')
      .notNullable();
  });

exports.down = knex =>
  knex.schema.table('menu_items', table => {
    table.dropColumn('section_id');
  });
