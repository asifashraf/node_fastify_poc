const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .createTable('currencies', table => {
      table.uuid('id').primary();
      table.string('name', 100).notNullable();
      table.string('code', 32).notNullable();
      table.string('code_ar');
      table
        .timestamp('created')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp('updated')
        .notNullable()
        .defaultTo(knex.fn.now());
    })
    .then(() => knex.raw(onUpdateTrigger('currencies')));

exports.down = knex => knex.schema.dropTable('currencies');
