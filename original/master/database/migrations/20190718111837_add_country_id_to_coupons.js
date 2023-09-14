exports.up = knex =>
  knex.schema.table('coupons', table => {
    table
      .uuid('country_id')
      .references('id')
      .inTable('countries')
      .index();
  });

exports.down = knex =>
  knex.schema.table('menus', table => {
    table.dropColumn('country_id');
  });
