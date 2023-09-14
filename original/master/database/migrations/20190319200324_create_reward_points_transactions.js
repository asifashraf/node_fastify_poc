const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .createTable('reward_points_transactions', table => {
      table.uuid('id').primary();
      table
        .uuid('reward_id')
        .references('id')
        .inTable('rewards')
        .index()
        .notNullable();
      table
        .uuid('order_set_id')
        .references('id')
        .inTable('order_sets')
        .index()
        .notNullable();
      table
        .string('customer_id')
        .references('id')
        .inTable('customers')
        .index()
        .notNullable();
      table.specificType('conversion_rate', 'numeric(13, 3)');
      table.specificType('points', 'numeric(13, 3)');
      table.string('source').notNullable();
      table
        .timestamp('created')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp('updated')
        .notNullable()
        .defaultTo(knex.fn.now());
    })
    .then(() => knex.raw(onUpdateTrigger('reward_points_transactions')));

exports.down = knex => knex.schema.dropTable('reward_points_transactions');
