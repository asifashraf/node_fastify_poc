const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .createTable('store_order_statuses', table => {
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
        .uuid('store_order_id')
        .references('id')
        .inTable('store_orders');
      table.string('status');
      table.string('rejection_reason', 1000);
      table.string('note', 1000);
    })
    .then(() => knex.raw(onUpdateTrigger('store_order_statuses')));

exports.down = knex => knex.schema.dropTable('store_order_statuses');
