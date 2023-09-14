const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .createTable('wallet_accounts', table => {
      table.uuid('id').primary();
      table
        .timestamp('created')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp('updated')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .string('customer_id')
        .references('id')
        .inTable('customers')
        .notNullable();
      table
        .uuid('currency_id')
        .references('id')
        .inTable('currencies');
      table.specificType('total', 'numeric(13,3)').default(0);
      table.specificType('regular_amount', 'numeric(13,3)').default(0);
      table.specificType('referral_amount', 'numeric(13,3)').default(0);
      table.integer('referral_amount_expires_on').default(0);
    })
    .then(() => knex.raw(onUpdateTrigger('wallet_accounts')));

exports.down = knex => knex.schema.dropTable('wallet_accounts');
