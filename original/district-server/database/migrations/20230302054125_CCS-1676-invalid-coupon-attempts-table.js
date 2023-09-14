

exports.up = function (knex) {
  return knex.schema.createTable('invalid_coupon_attempts', table => {
    table.uuid('id').primary().notNullable();
    table
      .string('customer_id')
      .references('id')
      .inTable('customers')
      .index()
      .notNullable();
    table.string('coupon_code').notNullable();
    table.string('country_id');
    table
      .uuid('brand_location_id')
      .references('id')
      .inTable('brand_locations')
      .index()
      .nullable();
    table
      .uuid('brand_id')
      .references('id')
      .inTable('brands')
      .index()
      .nullable();
    table
      .uuid('subscription_id')
      .references('id')
      .inTable('subscriptions')
      .index()
      .nullable();
    table.enu('order_type', ['REGULAR_ORDER', 'SUBSCRIPTION_ORDER'], {
      useNative: true,
      enumName: 'invalid_coupon_attempt_order_type_enum',
    }).defaultTo('REGULAR_ORDER');
    table
      .timestamp('created')
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .timestamp('updated')
      .notNullable()
      .defaultTo(knex.fn.now());
  });
};


exports.down = async function (knex) {
  await knex.schema.dropTable('invalid_coupon_attempts');
};
