const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = function (knex) {
    return knex.schema.createTable('abandoned_carts', table => {
        table.uuid('id').primary().notNullable();
        table.string('device_id').notNullable();
        table.string('customer_id').notNullable();
        table.uuid('basket_id').notNullable();
        table.uuid('order_set_id');
        table.uuid('country_id').notNullable();
        table.uuid('branch_id');
        table.jsonb('cart_items').notNullable();
        table.enu('status', ['ACTIVE', 'TIMEOUT', 'CLEARED', 'COMPLETED'], {
            useNative: true,
            enumName: 'abandoned_carts_status_enum',
        }).notNullable().defaultTo('ACTIVE');
        table
            .timestamp('created')
            .notNullable()
            .defaultTo(knex.fn.now());
        table
            .timestamp('updated')
            .notNullable()
            .defaultTo(knex.fn.now());
        table
            .timestamp('reminder_will_send_at');
        table
            .timestamp('last_reminder_sent_at');
        table.integer('reminder_count').notNullable().defaultTo(0);
    }).then(() => knex.raw(onUpdateTrigger('abandoned_carts')));
};

exports.down = async function (knex) {
    await knex.schema.dropTable('abandoned_carts');
};
