exports.up = knex =>
  knex.schema.createTable('brand_locations_coupons', table => {
    table
      .uuid('brand_location_id')
      .references('id')
      .inTable('brand_locations')
      .index()
      .notNullable()
      .onDelete('CASCADE');
    table
      .uuid('coupon_id')
      .references('id')
      .inTable('coupons')
      .index()
      .notNullable()
      .onDelete('CASCADE');
  });

exports.down = knex => knex.schema.dropTable('brand_locations_coupons');
