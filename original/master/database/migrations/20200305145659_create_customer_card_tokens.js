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
      table.string('type', 100);
      table.string('source_token').index();
      table.string('customer_token').index();
      table
        .text('customer_id')
        .references('id')
        .inTable('customers')
        .index();
      table.integer('expiry_month');
      table.integer('expiry_year');
      table.string('name');
      table.string('scheme');
      table.string('last_4', 4);
      table.string('bin', 100);
      table.string('card_type');
      table.string('card_category');
      table.string('issuer');
      table.string('issuer_country', 2).index();
      table.string('product_id', 100);
      table.string('product_type', 100);
      table.string('payment_provider', 100).index();
      table
        .string('status', 100)
        .defaultTo('ACTIVE')
        .index();
      table.boolean('is_default').defaultTo(false);
      table.text('provider_raw');
    })
    .then(() => knex.raw(onUpdateTrigger('customer_card_tokens')));

exports.down = knex => knex.schema.dropTable('customer_card_tokens');
