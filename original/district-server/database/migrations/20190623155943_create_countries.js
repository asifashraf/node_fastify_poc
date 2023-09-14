const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .createTable('countries', table => {
      table.uuid('id').primary();
      table
        .uuid('currency_id')
        .references('id')
        .inTable('currencies')
        .index()
        .notNullable();
      table.string('name', 200).notNullable();
      table.string('name_ar', 200);
      table.string('code', 32).notNullable();
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
    .then(() => knex.raw(onUpdateTrigger('countries')));

exports.down = knex => knex.schema.dropTable('countries');
