const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .createTable('admins', table => {
      table.uuid('id').primary();
      table.string('autho_id').notNullable();
      table.string('name', 100);
      table.string('email').notNullable();
      table.string('password', 200);
      table.string('status', 32).defaultTo(null);
      table.string('role', 32).defaultTo(null);
      table
        .timestamp('created')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp('updated')
        .notNullable()
        .defaultTo(knex.fn.now());
    })
    .then(() => knex.raw(onUpdateTrigger('admins')));

exports.down = knex => knex.schema.dropTable('admins');
