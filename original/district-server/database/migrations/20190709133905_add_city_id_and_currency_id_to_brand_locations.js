exports.up = knex =>
  knex.schema.table('brand_locations', table => {
    table
      .uuid('city_id')
      .references('id')
      .inTable('cities')
      .index();
    table
      .uuid('currency_id')
      .references('id')
      .inTable('currencies')
      .index();
  });

exports.down = knex =>
  knex.schema.table('brand_locations', table => {
    table.dropColumn('city_id');
    table.dropColumn('currency_id');
  });
