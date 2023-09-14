const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .createTable('store_order_sets', table => {
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
        .inTable('customers');
      table
        .uuid('currency_id')
        .references('id')
        .inTable('currencies');
      table
        .uuid('country_id')
        .references('id')
        .inTable('countries');
      table.string('short_code', 10).index();
      table.specificType('subtotal', 'numeric(13,3)').default(0);
      table.specificType('total', 'numeric(13,3)').default(0);
      table.specificType('fee', 'numeric(13,3)').default(0);
      table.string('payment_method', 32);
      table.string('payment_provider');
      table.string('merchant_id');
      table.string('receipt_url');
      table.string('error_url');
      table.boolean('paid').default(false);
      table.string('src', 60);
      table.string('src_platform');
      table.string('src_platform_version');
      table
        .specificType('vat', 'numeric(5, 2)')
        .defaultTo(0)
        .comment('percentage');
      table.specificType('total_vat', 'numeric(13, 3)').defaultTo(0);
    })
    .then(() => knex.raw(onUpdateTrigger('store_order_sets')));

exports.down = knex => knex.schema.dropTable('store_order_sets');
