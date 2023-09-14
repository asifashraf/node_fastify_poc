const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .createTable('nested_groups', table => {
      table.uuid('id').primary();
      table
        .uuid('group_id')
        .references('id')
        .inTable('groups')
        .index()
        .notNullable()
        .onDelete('CASCADE');
      table
        .uuid('nested_group_id')
        .references('id')
        .inTable('groups')
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
    .then(() => knex.raw(onUpdateTrigger('nested_groups')));

exports.down = knex => knex.schema.dropTable('nested_groups');
