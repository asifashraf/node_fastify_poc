const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .createTable('transactions', table => {
      table.uuid('id').primary();
      table
        .string('customer_id')
        .references('id')
        .inTable('customers')
        .index()
        .notNullable();
      table.string('action', 75).notNullable();
      table.string('type', 75).notNullable();
      table
        .uuid('order_set_id')
        .references('id')
        .inTable('order_sets')
        .index();
      table.specificType('amount', 'numeric(13, 3)');
      table.string('currency', 50);
      table
        .timestamp('created')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp('updated')
        .notNullable()
        .defaultTo(knex.fn.now());
    })
    .then(() => knex.raw(onUpdateTrigger('transactions')));

exports.down = knex => knex.schema.dropTable('transactions');
