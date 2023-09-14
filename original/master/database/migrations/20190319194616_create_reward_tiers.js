const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .createTable('reward_tiers', table => {
      table.uuid('id').primary();
      table
        .uuid('reward_id')
        .references('id')
        .inTable('rewards')
        .index()
        .notNullable();
      table.string('title').notNullable();
      table.string('logo_url').notNullable();
      table.specificType('required_points', 'numeric(13, 3)');
      table
        .timestamp('created')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp('updated')
        .notNullable()
        .defaultTo(knex.fn.now());
    })
    .then(() => knex.raw(onUpdateTrigger('reward_tiers')));

exports.down = knex => knex.schema.dropTable('reward_tiers');
