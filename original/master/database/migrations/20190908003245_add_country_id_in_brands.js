exports.up = knex =>
  knex.schema.table('brands', table => {
    table
      .uuid('country_id')
      .references('id')
      .inTable('countries')
      .index();
  });

exports.down = knex =>
  knex.schema.table('brands', table => {
    table.dropColumn('country_id');
  });
