const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema.createTable('order_rating', table => {
    table.uuid('id').primary();
    table
      .uuid('order_set_id')
      .references('id')
      .inTable('order_sets')
      .index()
      .unique()
      .notNullable();
    table
      .uuid('brand_location_id')
      .references('id')
      .inTable('brand_locations')
      .index()
      .notNullable();
    table.integer('rating').notNullable();
    table
      .string('customer_id')
      .references('id')
      .inTable('customers')
      .index()
      .notNullable();
    table.string('fulfillment_type').notNullable();
    table.string('customer_name').notNullable();
    table.string('comment', 280);
    table.jsonb('details');
    table
      .timestamp('created_at')
      .notNullable()
      .defaultTo(knex.fn.now());
    table.timestamp('updated').nullable();
  })
    .then(() => knex.raw(onUpdateTrigger('order_rating')));

exports.down = knex => knex.schema.dropTable('order_rating');
