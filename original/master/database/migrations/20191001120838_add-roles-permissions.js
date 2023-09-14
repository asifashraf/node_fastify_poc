const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .createTable('role_permissions', table => {
      table.uuid('id').primary();
      table
        .uuid('role_id')
        .references('id')
        .inTable('roles')
        .index()
        .notNullable()
        .onDelete('CASCADE');
      table
        .uuid('permission_id')
        .references('id')
        .inTable('permissions')
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
    .then(() => knex.raw(onUpdateTrigger('role_permissions')));

exports.down = knex => knex.schema.dropTable('role_permissions');
