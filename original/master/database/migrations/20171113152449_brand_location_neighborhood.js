exports.up = knex =>
  knex.schema.createTable('brand_locations_neighborhoods', table => {
    table
      .uuid('brand_location_id')
      .references('id')
      .inTable('brand_locations')
      .index()
      .notNullable()
      .onDelete('CASCADE');
    table
      .uuid('neighborhood_id')
      .references('id')
      .inTable('neighborhoods')
      .index()
      .notNullable()
      .onDelete('CASCADE');
  });

exports.down = knex => knex.schema.dropTable('brand_locations_neighborhoods');
