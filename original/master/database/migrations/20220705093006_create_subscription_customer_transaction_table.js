
const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
    knex.schema
        .createTable('subscription_customer_transactions', table => {
            table.uuid('id')
                .notNullable().primary();
            table.uuid('subscription_customer_id')
                .references('id')
                .inTable('subscription_customers')
                .index()
                .notNullable();
            table.enu('action_type', ['STARTED', 'PAUSED', 'RESUMED', 'FINISHED', 'ORDER_PLACED'], {
                useNative: true,
                enumName: 'subscription_action_type_enum',
            });
            table.integer('remaining_cups');
            table.bigInteger('remaining_minutes');
            table.integer('credit');
            table.integer('debit');
            table.enu('reference_order_type', ['SUBSCRIPTION_ORDER', 'ORDER_SET'], {
                useNative: true,
                enumName: 'subscription_reference_order_type_enum',
            });
            table.uuid('reference_order_id');
            table
                .timestamp('created')
                .notNullable()
                .defaultTo(knex.fn.now());
            table
                .timestamp('updated')
                .notNullable()
                .defaultTo(knex.fn.now());
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
                .uuid('country_id')
                .references('id')
                .inTable('countries')
                .index();
            table
                .uuid('brand_id')
                .references('id')
                .inTable('brands')
                .index();
            table
                .uuid('branch_id')
                .references('id')
                .inTable('brand_locations')
                .index();
        })
        .then(() => knex.raw(onUpdateTrigger('subscription_customer_transactions')));

exports.down = knex => knex.schema.dropTable('subscription_customer_transactions');
