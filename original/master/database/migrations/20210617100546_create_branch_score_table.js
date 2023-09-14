const { onUpdateTrigger } = require('../../knexfile.js');
exports.up = knex =>
  knex.schema.createTable('brand_location_score', table => {
    table.uuid('id').primary();
    table
      .uuid('brand_location_id')
      .references('id')
      .inTable('brand_locations')
      .index()
      .unique()
      .notNullable();
    table.integer('total_score').notNullable();
    table.integer('total_reviews').notNullable();
    table
      .timestamp('created_at')
      .notNullable()
      .defaultTo(knex.fn.now());
    table.timestamp('updated').nullable();
  })
    .then(() => knex.raw(onUpdateTrigger('brand_location_score')));

exports.down = knex => knex.schema.dropTable('brand_location_score');
