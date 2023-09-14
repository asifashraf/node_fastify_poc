const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .createTable('gift_card_orders', table => {
      table.uuid('id').primary();
      table.string('short_code');

      table
        .specificType('amount', 'numeric(13, 3)')
        .default(0)
        .notNullable();
      table
        .uuid('currency_id')
        .references('id')
        .inTable('currencies')
        .index();
      table
        .uuid('country_id')
        .references('id')
        .inTable('countries')
        .index()
        .notNullable();
      // payment: PaymentInfo!
      table.string('payment_method', 32).defaultTo(null);
      table
        .uuid('gift_card_template_id')
        .references('id')
        .inTable('gift_card_templates')
        .index()
        .notNullable();
      table
        .string('customer_id')
        .references('id')
        .inTable('customers')
        .index()
        .notNullable();
      table.string('delivery_method').notNullable();
      table.string('receiver_email');
      table.string('receiver_phone_number');
      table.boolean('anonymous_sender').notNullable();
      table
        .timestamp('created')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp('updated')
        .notNullable()
        .defaultTo(knex.fn.now());
    })
    .then(() => knex.raw(onUpdateTrigger('gift_card_orders')));

exports.down = knex => knex.schema.dropTable('gift_card_orders');
