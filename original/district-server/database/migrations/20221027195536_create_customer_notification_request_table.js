const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = function (knex) {
    return knex.schema.createTable('customer_notification_request', table => {
        table.uuid('id').primary().notNullable();
        table.string('customer_id')
            .references('id')
            .inTable('customers')
            .index()
            .notNullable();
        table.uuid('brand_location_id')
            .references('id')
            .inTable('brand_locations')
            .index()
            .notNullable();
        table.boolean('status').defaultTo(true)
        /*    
        table.enu('status', ['INIT','SENT', 'FAILED', 'REMOVED'], {
            useNative: true,
            enumName: 'customer_notification_status_enum',
            }).notNullable();
        */    
        table
            .timestamp('created')
            .notNullable()
            .defaultTo(knex.fn.now());
        table
            .timestamp('updated')
            .notNullable()
            .defaultTo(knex.fn.now());
    }).then(() => knex.raw(onUpdateTrigger('customer_notification_request')));
};

exports.down = async function (knex) {
    return knex.schema.dropTable('customer_notification_request');
};
