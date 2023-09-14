const { onUpdateTrigger } = require('../../knexfile.js');

const tableName = 'brand_location_activity_logs';

exports.up = knex =>
  knex.schema
    .createTable(tableName, table => {
      table.uuid('id').primary();
      table
        .uuid('branch_id')
        .index()
        .notNullable();
      table.string('event_type', 64).notNullable();
      table.string('event_data', 512);
      table
        .timestamp('created')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp('updated')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .foreign('branch_id')
        .references('id')
        .inTable('brand_locations')
        .onDelete('CASCADE')
        .onUpdate('CASCADE');
    })
    .then(() => knex.raw(onUpdateTrigger(tableName)));

exports.down = knex => knex.schema.dropTable(tableName);
