const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .table('brands', table => {
      table
        .timestamp('created')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp('updated')
        .notNullable()
        .defaultTo(knex.fn.now());
    })
    .then(() => knex.raw(onUpdateTrigger('brands')));

exports.down = knex =>
  knex.schema.table('brands', table => {
    table.dropColumn('created');
    table.dropColumn('updated');
  });
