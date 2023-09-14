const { onUpdateTrigger } = require('../../knexfile.js');

const tableName = 'auth_customer';

exports.up = knex =>
  knex.schema
    .createTable(tableName, table => {
      table.string('id').primary();
      table.string('phone_number').index();
      table.string('email');
      table.string('password');
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
