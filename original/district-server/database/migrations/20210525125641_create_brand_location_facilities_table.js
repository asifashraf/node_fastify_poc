const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .createTable('brand_location_facilities', table => {
      table.uuid('id').primary();
      table
        .uuid('brand_location_id')
        .references('id')
        .inTable('brand_locations')
        .index()
        .notNullable();
      table.string('type').notNullable();
      table
        .timestamp('created')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp('updated')
        .notNullable()
        .defaultTo(knex.fn.now());
    })
    .then(() => knex.raw(onUpdateTrigger('brand_location_facilities')));

exports.down = knex => knex.schema.dropTable('brand_location_facilities');
