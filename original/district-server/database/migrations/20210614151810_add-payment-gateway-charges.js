const { onUpdateTrigger } = require('../../knexfile.js');

const tableName = 'payment_gateway_charges';

exports.up = knex =>
  knex.schema
    .createTable(tableName, table => {
      table.string('id').primary();
      table
        .uuid('country_id')
        .references('id')
        .inTable('countries')
        .index()
        .notNullable();

      table.string('payment_method');
      table.string('payment_gateway');
      table.string('charge_type');
      table.specificType('charge', 'numeric(13, 3)');
      table
        .timestamp('created')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp('updated')
        .notNullable()
        .defaultTo(knex.fn.now());
    })
    .then(() => knex.raw(onUpdateTrigger(tableName)));

exports.down = knex => knex.schema.dropTable(tableName);
