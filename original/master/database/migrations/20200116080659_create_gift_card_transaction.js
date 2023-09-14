const { onUpdateTrigger } = require('../../knexfile.js');
exports.up = knex =>
  knex.schema
    .createTable('gift_card_transactions', table => {
      table.uuid('id').primary();
      table
        .uuid('gift_card_id')
        .references('id')
        .inTable('gift_cards')
        .index()
        .notNullable();
      table.string('order_type').notNullable();
      // order id ?
      table.specificType('credit', 'numeric(13, 3)').notNullable();
      table.specificType('debit', 'numeric(13, 3)').notNullable();
      // currency ?
      // customer ?
      table
        .timestamp('created')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp('updated')
        .notNullable()
        .defaultTo(knex.fn.now());
    })
    .then(() => knex.raw(onUpdateTrigger('gift_card_transactions')));

exports.down = knex => knex.schema.dropTable('gift_card_transactions');
