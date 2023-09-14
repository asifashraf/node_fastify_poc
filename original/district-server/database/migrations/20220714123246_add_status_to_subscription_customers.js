exports.up = function (knex) {
    return knex.schema.alterTable('subscription_customers', tableBuilder => {
        tableBuilder.enu('status', ['ACTIVE', 'INACTIVE'], {
            useNative: true,
            enumName: 'subscription_customer_status_type_enum',
        });
    });
};

exports.down = function (knex) {
    return knex.schema.alterTable('subscription_customers', tableBuilder => {
        tableBuilder.dropColumn('status');
    });
};

