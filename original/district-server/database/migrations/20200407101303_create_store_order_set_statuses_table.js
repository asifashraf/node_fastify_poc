const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .createTable('store_order_set_statuses', table => {
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
        .uuid('store_order_set_id')
        .references('id')
        .inTable('store_order_sets');
      table.string('status');
    })
    .then(() => knex.raw(onUpdateTrigger('store_order_set_statuses')));

exports.down = knex => knex.schema.dropTable('store_order_set_statuses');
