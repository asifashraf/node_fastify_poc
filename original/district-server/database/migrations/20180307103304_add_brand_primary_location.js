exports.up = knex =>
  knex.schema.alterTable('brands', table => {
    table
      .uuid('primary_location_id')
      .references('id')
      .inTable('brand_locations')
      .nullable()
      .onDelete('SET NULL');
  });

exports.down = knex =>
  knex.schema.alterTable('brands', table => {
    table.dropColumn('primary_location_id');
  });
