exports.up = knex =>
  knex.schema.table('brand_location_addresses', table => {
    table
      .uuid('neighborhood_id')
      .references('id')
      .inTable('neighborhoods')
      .index();
  });

exports.down = knex =>
  knex.schema.table('brand_location_addresses', table => {
    table.dropColumn('neighborhood_id');
  });
