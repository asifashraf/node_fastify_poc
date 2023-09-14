const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .createTable('rewards', table => {
      table.uuid('id').primary();
      table
        .uuid('brand_id')
        .references('id')
        .inTable('brands')
        .index()
        .notNullable();
      table.string('title');
      table.specificType('conversion_rate', 'numeric(13, 3)');
      table
        .timestamp('created')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp('updated')
        .notNullable()
        .defaultTo(knex.fn.now());
    })
    .then(() => knex.raw(onUpdateTrigger('rewards')));

exports.down = knex => knex.schema.dropTable('rewards');
