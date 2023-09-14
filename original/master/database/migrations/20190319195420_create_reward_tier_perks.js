const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .createTable('reward_tier_perks', table => {
      table.uuid('id').primary();
      table
        .uuid('reward_tier_id')
        .references('id')
        .inTable('reward_tiers')
        .index()
        .notNullable();
      table.string('title').notNullable();
      table.specificType('value', 'numeric(13, 3)');
      table.string('type').notNullable();
      table.string('apply_type').notNullable();
      table
        .timestamp('created')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp('updated')
        .notNullable()
        .defaultTo(knex.fn.now());
    })
    .then(() => knex.raw(onUpdateTrigger('reward_tier_perks')));

exports.down = knex => knex.schema.dropTable('reward_tier_perks');
