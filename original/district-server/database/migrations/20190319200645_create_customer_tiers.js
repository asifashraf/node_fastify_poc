const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .createTable('customer_tiers', table => {
      table.uuid('id').primary();
      table
        .uuid('reward_tier_id')
        .references('id')
        .inTable('reward_tiers')
        .index()
        .notNullable();
      table
        .string('customer_id')
        .references('id')
        .inTable('customers')
        .index()
        .notNullable();
      table
        .uuid('brand_id')
        .references('id')
        .inTable('brands')
        .index()
        .notNullable();
      table
        .timestamp('created')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp('updated')
        .notNullable()
        .defaultTo(knex.fn.now());
    })
    .then(() => knex.raw(onUpdateTrigger('customer_tiers')));

exports.down = knex => knex.schema.dropTable('customer_tiers');
