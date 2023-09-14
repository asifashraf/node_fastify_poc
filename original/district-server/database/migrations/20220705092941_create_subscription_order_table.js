const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
    knex.schema
        .createTable('subscription_orders', table => {
            table.uuid('id')
                .notNullable().primary();
            table.string('short_code');
            table.uuid('subscription_id')
                .references('id')
                .inTable('subscriptions')
                .index()
                .notNullable();
            table
                .specificType('total', 'numeric(13, 3)')
                .default(0)
                .notNullable();
            table
                .specificType('sub_total', 'numeric(13, 3)')
                .default(0)
                .notNullable();
            table
                .string('customer_id')
                .references('id')
                .inTable('customers')
                .index()
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

            table.string('payment_method', 32);
            table.string('payment_provider');
            table.json('pre_paid');
            table.string('merchant_id');
            table.string('receipt_url');
            table.string('error_url');
            table.string('src', 60);
            table.string('src_platform');
            table.string('src_platform_version');
            table
                .specificType('vat', 'numeric(5, 2)')
                .defaultTo(0)
                .comment('percentage');
            table.specificType('total_vat', 'numeric(13, 3)').defaultTo(0);
            table
                .boolean('credits_used')
                .notNullable()
                .default(false);
            table
                .timestamp('created')
                .notNullable()
                .defaultTo(knex.fn.now());
            table
                .timestamp('updated')
                .notNullable()
                .defaultTo(knex.fn.now());
        })
        .then(() => knex.raw(onUpdateTrigger('subscription_orders')));

exports.down = knex => knex.schema.dropTable('subscription_orders');
