exports.up = knex =>
  knex.schema.createTable('customers_coupons', table => {
    table
      .string('customer_id')
      .references('id')
      .inTable('customers')
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
    table
      .integer('redemptions')
      .notNullable()
      .default(1);
  });

exports.down = knex => knex.schema.dropTable('customers_coupons');
