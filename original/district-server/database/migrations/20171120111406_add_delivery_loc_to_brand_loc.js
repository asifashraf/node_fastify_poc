exports.up = knex =>
  knex.schema.table('brand_locations', table => {
    table
      .uuid('delivery_location_id')
      .references('id')
      .inTable('brand_locations');
  });

exports.down = knex =>
  knex.schema.table('brand_locations', table => {
    table.dropColumn('delivery_location_id');
  });
