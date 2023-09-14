const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .createTable('customer_card_tokens', table => {
      table.uuid('id').primary();
      table
        .timestamp('created')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp('updated')
        .notNullable()
        .defaultTo(knex.fn.now());
      table.string('token').index();
      table.string('number', 16).index();
      table.integer('expiry_month');
      table.integer('expiry_year');
      table.string('brand');
      table.string('issuer');
      table.string('payment_service', 20).index();
      table
        .text('customer_id')
        .references('id')
        .inTable('customers')
        .index();
    })
    .then(() => knex.raw(onUpdateTrigger('customer_card_tokens')));

exports.down = knex => knex.schema.dropTable('customer_card_tokens');
