const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .createTable('group_admins', table => {
      table.uuid('id').primary();
      table
        .uuid('group_id')
        .references('id')
        .inTable('groups')
        .index()
        .notNullable()
        .onDelete('CASCADE');
      table
        .uuid('admin_id')
        .references('id')
        .inTable('admins')
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
    .then(() => knex.raw(onUpdateTrigger('group_admins')));

exports.down = knex => knex.schema.dropTable('group_admins');
