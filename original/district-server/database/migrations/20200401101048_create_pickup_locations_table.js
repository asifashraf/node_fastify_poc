const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .createTable('pickup_locations', table => {
      table.uuid('id').primary();
      table
        .timestamp('created')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp('updated')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .uuid('brand_id')
        .references('id')
        .inTable('brands');
      table.specificType('geolocation', 'geometry(Point,4326)');
    })
    .then(() => knex.raw(onUpdateTrigger('pickup_locations')));

exports.down = knex => knex.schema.dropTable('pickup_locations');
