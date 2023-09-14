const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .createTable('referrals', table => {
      table.uuid('id').primary();
      table
        .string('sender_id')
        .references('id')
        .inTable('customers')
        .index()
        .notNullable();
      table.specificType('sent_amount', 'numeric(13, 3)').notNullable();
      table
        .string('receiver_id')
        .references('id')
        .inTable('customers')
        .index()
        .notNullable();
      table.specificType('received_amount', 'numeric(13, 3)').notNullable();
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
    .then(() => knex.raw(onUpdateTrigger('referrals')));

exports.down = knex => knex.schema.dropTable('referrals');
