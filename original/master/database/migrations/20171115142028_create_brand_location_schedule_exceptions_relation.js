exports.up = knex =>
  knex.schema.table('schedule_exceptions', table => {
    table
      .uuid('brand_location_id')
      .references('id')
      .inTable('brand_locations')
      .index()
      .notNullable();
  });

exports.down = knex =>
  knex.schema.table('schedule_exceptions', table => {
    table.dropColumn('brand_location_id');
  });
