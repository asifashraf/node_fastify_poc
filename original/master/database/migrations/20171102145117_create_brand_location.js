exports.up = knex =>
  knex.schema.createTable('brand_locations', table => {
    table.uuid('id').primary();
    table
      .uuid('brand_id')
      .references('id')
      .inTable('brands')
      .index()
      .notNullable();
    table.string('short_address');
    table.string('phone');
    table.string('hero_photo');
    table.boolean('has_delivery');
    table.boolean('has_pickup');
    table.boolean('has_catering');
  });

exports.down = knex => knex.schema.dropTable('brand_locations');
