exports.up = knex =>
  knex.schema.table('brand_location_addresses', table =>
    table
      .uuid('city_id')
      .references('id')
      .inTable('cities')
      .index()
  );

exports.down = knex =>
  knex.schema.table('brand_location_addresses', table =>
    table.dropColumn('city_id')
  );
