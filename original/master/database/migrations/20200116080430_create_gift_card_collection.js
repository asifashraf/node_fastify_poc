const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .createTable('gift_card_collections', table => {
      table.uuid('id').primary();
      table.string('name');
      table.string('name_ar');
      table
        .uuid('country_id')
        .references('id')
        .inTable('countries')
        .index()
        .notNullable();
      table.string('status').notNullable();
      table
        .timestamp('created')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp('updated')
        .notNullable()
        .defaultTo(knex.fn.now());
    })
    .then(() => knex.raw(onUpdateTrigger('gift_card_collections')));

exports.down = knex => knex.schema.dropTable('gift_card_collections');
