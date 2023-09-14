const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .createTable('customer_used_perks', table => {
      table.uuid('id').primary();
      table
        .string('customer_id')
        .references('id')
        .inTable('customers')
        .index()
        .notNullable();
      table
        .uuid('reward_tier_perk_id')
        .references('id')
        .inTable('reward_tier_perks')
        .index()
        .notNullable();
      table
        .uuid('brand_id')
        .references('id')
        .inTable('brands')
        .index()
        .notNullable();
      table
        .uuid('order_set_id')
        .references('id')
        .inTable('order_sets')
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
    .then(() => knex.raw(onUpdateTrigger('customer_used_perks')));

exports.down = knex => knex.schema.dropTable('customer_used_perks');
