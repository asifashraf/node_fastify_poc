const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
    knex.schema
        .createTable('subscription_customers', table => {
            table.uuid('id')
                .notNullable().primary();
            table.uuid('subscription_id')
                .references('id')
                .inTable('subscriptions')
                .index()
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
                .uuid('subscription_order_id')
                .references('id')
                .inTable('subscription_orders')
                .index()
                .notNullable();
            table
                .specificType('price', 'numeric(13, 3)');
            table.integer('total_cups_count');
            table.integer('per_day_cups_count');
            table.integer('per_order_max_cups_count');
            table.bigInteger('period');
            table
                .timestamp('created')
                .notNullable()
                .defaultTo(knex.fn.now());
            table
                .timestamp('updated')
                .notNullable()
                .defaultTo(knex.fn.now());
        })
        .then(() => knex.raw(onUpdateTrigger('subscription_customers')));

exports.down = knex => knex.schema.dropTable('subscription_customers');
