const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .createTable('wallet_account_referrals', table => {
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
        .uuid('wallet_account_id')
        .references('id')
        .inTable('wallet_accounts')
        .notNullable();
      table
        .uuid('sender_wallet_account_id')
        .references('id')
        .inTable('wallet_accounts')
        .index()
        .onDelete('CASCADE');

      table.specificType('amount', 'numeric(13,3)').default(0);
      table.integer('expires_on').default(0);
      table.boolean('expired').defaultTo(false);
    })
    .then(() => knex.raw(onUpdateTrigger('wallet_account_referrals')));

exports.down = knex => knex.schema.dropTable('wallet_account_referrals');
