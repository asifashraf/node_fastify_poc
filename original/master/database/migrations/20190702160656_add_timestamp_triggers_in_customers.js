const { onUpdateTrigger } = require('../../knexfile.js');
exports.up = knex =>
  knex.schema
    .table('customers', table => {
      table.dropColumn('created_at');
      table.dropColumn('updated_at');
      table
        .timestamp('created')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp('updated')
        .notNullable()
        .defaultTo(knex.fn.now());
    })
    .then(() => knex.raw(onUpdateTrigger('customers')));

exports.down = knex =>
  knex.schema.table('customers', table => {
    table.dropColumn('created');
    table.dropColumn('updated');
    table
      .datetime('created_at')
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .datetime('updated_at')
      .notNullable()
      .defaultTo(knex.fn.now());
  });
