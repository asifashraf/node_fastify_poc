const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .createTable('cities', table => {
      table.uuid('id').primary();
      table
        .uuid('country_id')
        .references('id')
        .inTable('countries')
        .index()
        .notNullable();
      table.string('name', 200).notNullable();
      table.string('name_ar', 200);
      table.string('status', 32).defaultTo(null);
      table
        .timestamp('created')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp('updated')
        .notNullable()
        .defaultTo(knex.fn.now());
    })
    .then(() => knex.raw(onUpdateTrigger('cities')));

exports.down = knex => knex.schema.dropTable('cities');
