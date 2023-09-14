exports.up = knex =>
  knex.schema.table('menus', table => {
    table
      .uuid('brand_id')
      .references('id')
      .inTable('brands')
      .notNullable();
  });

exports.down = knex =>
  knex.schema.table('menus', table => {
    table.dropColumn('brand_id');
  });
