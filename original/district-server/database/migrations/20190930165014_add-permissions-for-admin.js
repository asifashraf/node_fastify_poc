const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .createTable('permissions', table => {
      table.uuid('id').primary();
      table.string('name').notNullable();
      table.string('description', 100);
      table
        .timestamp('created')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp('updated')
        .notNullable()
        .defaultTo(knex.fn.now());
    })
    .then(() => knex.raw(onUpdateTrigger('permissions')));

exports.down = knex => knex.schema.dropTable('permissions');
