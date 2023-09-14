exports.up = knex =>
  knex.schema.createTable('brands_coupons', table => {
    table
      .uuid('brand_id')
      .references('id')
      .inTable('brands')
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

exports.down = knex => knex.schema.dropTable('brands_coupons');
