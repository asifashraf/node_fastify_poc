const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .createTable('customer_groups', table => {
      table.uuid('id').primary();
      table
        .timestamp('created')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp('updated')
        .notNullable()
        .defaultTo(knex.fn.now());
      table.string('name');
      table.boolean('generated').defaultTo(false);
    })
    .then(() => knex.raw(onUpdateTrigger('customer_groups')));

exports.down = knex => knex.schema.dropTable('customer_groups');
