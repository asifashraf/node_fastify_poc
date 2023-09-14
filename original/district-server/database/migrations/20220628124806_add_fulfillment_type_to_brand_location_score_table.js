const { onUpdateTrigger } = require('../../knexfile.js');
exports.up = knex =>
  knex.schema.createTable('brand_location_score_fulfillment', table => {
    table.uuid('id').primary();
    table
      .uuid('brand_location_id')
      .references('id')
      .inTable('brand_locations')
      .index()
      .notNullable();
    table.integer('total_score').notNullable();
    table.integer('total_reviews').notNullable();
    table.string('fulfillment_type').notNullable();
    table
      .timestamp('created_at')
      .notNullable()
      .defaultTo(knex.fn.now());
    table.timestamp('updated').nullable();
    table.unique(['brand_location_id', 'fulfillment_type']);
  })
    .then(() => knex.raw(onUpdateTrigger('brand_location_score_fulfillment')));

exports.down = knex => knex.schema.dropTable('brand_location_score_fulfillment');
