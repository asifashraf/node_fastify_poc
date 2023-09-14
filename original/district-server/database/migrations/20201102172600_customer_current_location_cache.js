const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .createTable('customer_current_location_cache', table => {
      table.uuid('id').primary();
      table
        .string('customer_id')
        .notNullable()
        .index();
      table.specificType('geolocation', 'geometry(Point,4326)');
      table.datetime('expire_at');
      table.string('line_1').default('');
      table
        .timestamp('created')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp('updated')
        .notNullable()
        .defaultTo(knex.fn.now());
    })
    .then(() => knex.raw(onUpdateTrigger('customer_current_location_cache')));

exports.down = knex => knex.schema.dropTable('customer_current_location_cache');
