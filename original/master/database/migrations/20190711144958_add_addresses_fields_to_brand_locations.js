exports.up = knex =>
  knex.schema.table('brand_locations', table => {
    table
      .uuid('neighborhood_id')
      .references('id')
      .inTable('neighborhoods')
      .index();
    table.string('name');
    table.string('name_ar');
    table.string('street');
    table.string('street_ar');
    table.specificType('geolocation', 'geometry(Point,4326)');
  });

exports.down = knex =>
  knex.schema.table('brand_locations', table => {
    table.dropColumn('neighborhood_id');
    table.dropColumn('name');
    table.dropColumn('name_ar');
    table.dropColumn('street');
    table.dropColumn('street_ar');
    table.dropColumn('geolocation');
  });
