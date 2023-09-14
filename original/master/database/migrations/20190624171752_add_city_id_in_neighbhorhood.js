exports.up = knex =>
  knex.schema.table('neighborhoods', table => {
    table
      .uuid('city_id')
      .references('id')
      .inTable('cities')
      .index();
  });

exports.down = knex =>
  knex.schema.table('neighborhoods', table => {
    table.dropColumn('city_id');
  });
