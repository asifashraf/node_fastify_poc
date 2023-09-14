const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .createTable('gift_cards', table => {
      table.uuid('id').primary();
      table
        .uuid('gift_card_order_id')
        .references('id')
        .inTable('gift_card_orders')
        .index()
        .notNullable();
      table.string('image_url');
      table.string('image_url_ar');
      table.string('code').notNullable();
      table.specificType('initial_amount', 'numeric(13, 3)').notNullable();
      table.specificType('amount', 'numeric(13, 3)').notNullable();
      table
        .uuid('gift_card_template')
        .references('id')
        .inTable('gift_card_templates')
        .index();
      table
        .string('sender_id')
        .references('id')
        .inTable('customers')
        .index()
        .notNullable();
      table.boolean('anonymous_sender').notNullable();
      table
        .string('receiver_id')
        .references('id')
        .inTable('customers')
        .index();
      table.timestamp('redeemed_on');
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
    .then(() => knex.raw(onUpdateTrigger('gift_cards')));

exports.down = knex => knex.schema.dropTable('gift_cards');
