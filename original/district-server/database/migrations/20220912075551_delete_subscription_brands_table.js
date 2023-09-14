const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = function(knex) {
    return knex.schema.dropTable('subscription_brands');
};

exports.down = function(knex) {
    return knex.schema.createTable('subscription_brands', table => {
        table.uuid('id')
            .primary()
            .notNullable();
        table.uuid('subscription_id')
            .references('id')
            .inTable('subscriptions')
            .index()
            .notNullable();
        table.uuid('brand_id')
            .references('id')
            .inTable('brands')
            .index()
            .notNullable();
        table.enu('status', ['ACTIVE', 'INACTIVE'], {
            useNative: true,
            enumName: 'subscription_brand_status_enum',
        });
        table.timestamp('created')
            .notNullable()
            .defaultTo(knex.fn.now());
        table.timestamp('updated')
            .notNullable()
            .defaultTo(knex.fn.now());
    }).then(() => knex.raw(onUpdateTrigger('subscription_brands')));
};
