exports.up = knex =>
  knex.schema.table('brand_locations', table => {
    table.dropColumn('neighborhood_id');
    table.dropColumn('city_id');
    table.dropColumn('street');
    table.dropColumn('street_ar');
    table.dropColumn('geolocation');
  });

exports.down = knex =>
  knex.schema.table('brand_locations', table => {
    table
      .uuid('neighborhood_id')
      .references('id')
      .inTable('neighborhoods')
      .index();
    table
      .uuid('city_id')
      .references('id')
      .inTable('cities')
      .index();
    table.string('street');
    table.string('street_ar');
    table.specificType('geolocation', 'geometry(Point,4326)');
  });
