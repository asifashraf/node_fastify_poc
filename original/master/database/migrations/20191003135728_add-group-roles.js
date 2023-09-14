const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .createTable('group_roles', table => {
      table.uuid('id').primary();
      table
        .uuid('group_id')
        .references('id')
        .inTable('groups')
        .index()
        .notNullable()
        .onDelete('CASCADE');
      table
        .uuid('role_id')
        .references('id')
        .inTable('roles')
        .index()
        .notNullable()
        .onDelete('CASCADE');
      table
        .timestamp('created')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp('updated')
        .notNullable()
        .defaultTo(knex.fn.now());
    })
    .then(() => knex.raw(onUpdateTrigger('group_roles')));

exports.down = knex => knex.schema.dropTable('group_roles');
