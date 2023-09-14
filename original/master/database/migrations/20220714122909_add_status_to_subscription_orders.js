exports.up = function (knex) {
    return knex.schema.alterTable('subscription_orders', tableBuilder => {
        tableBuilder.enu('status', ['INITIATED', 'FAILED', 'COMPLETED'], {
            useNative: true,
            enumName: 'subscription_order_status_type_enum',
        });
    });
};

exports.down = function (knex) {
    return knex.schema.alterTable('subscription_orders', tableBuilder => {
        tableBuilder.dropColumn('status');
    });
};

