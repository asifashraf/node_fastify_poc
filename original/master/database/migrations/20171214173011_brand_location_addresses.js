exports.up = knex =>
  knex.schema
    .createTable('brand_location_addresses', table => {
      table.uuid('id').primary();
      table
        .uuid('brand_location_id')
        .references('id')
        .inTable('brand_locations')
        .index()
        .notNullable()
        .onDelete('CASCADE');
      table.string('short_address').notNullable();
      table.string('street').notNullable();
      table.string('city').notNullable();
      table.specificType('geolocation', 'geometry(Point,4326)');
    })
    .table('brand_locations', table => {
      table.dropColumn('address_id');
    });

exports.down = knex =>
  knex.schema
    .table('brand_locations', table => {
      table
        .uuid('address_id')
        .references('id')
        .inTable('addresses')
        .index()
        .notNullable()
        .onDelete('CASCADE');
    })
    .dropTable('brand_location_addresses');
