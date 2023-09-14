const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .createTable('signup_promos', table => {
      table.uuid('id').primary();
      table.string('type', 150).notNullable();
      table.string('code', 32).notNullable();
      table
        .string('status', 32)
        .notNullable()
        .defaultTo('ACTIVE');
      table.specificType('reward_amount', 'numeric(13, 3)').notNullable();
      table
        .uuid('currency_id')
        .references('id')
        .inTable('currencies')
        .index();
      table
        .uuid('country_id')
        .references('id')
        .inTable('countries')
        .index();
      table
        .timestamp('created')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp('updated')
        .notNullable()
        .defaultTo(knex.fn.now());
    })
    .then(() => knex.raw(onUpdateTrigger('signup_promos')));

exports.down = knex => knex.schema.dropTable('signup_promos');
