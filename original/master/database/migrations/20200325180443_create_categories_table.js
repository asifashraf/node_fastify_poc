const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .createTable('categories', table => {
      table.uuid('id').primary();
      table
        .timestamp('created')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp('updated')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .string('status', 32)
        .index()
        .notNullable()
        .defaultTo('ACTIVE');
      table.string('name');
      table.string('name_ar');
      table.integer('sort_order').default(0);
      table.string('photo');
    })
    .then(() => knex.raw(onUpdateTrigger('categories')));

exports.down = knex => knex.schema.dropTable('categories');
