exports.up = function (knex) {
    return knex.schema
    .alterTable('subscriptions', table => {
        table.uuid('brand_id')
            .notNullable()
            .alter();
    })
    .alterTable('subscription_customers', table => {
        table.uuid('brand_id')
            .notNullable()
            .alter();
    })
    .alterTable('subscription_customer_transactions', table => {
        table.uuid('brand_id')
            .notNullable()
            .alter();
    });
};

exports.down = function (knex) {
    return knex.schema
    .alterTable('subscriptions', table => {
        table.uuid('brand_id')
            .nullable()
            .alter();
    })
    .alterTable('subscription_customers', table => {
        table.uuid('brand_id')
            .nullable()
            .alter();
    })
    .alterTable('subscription_customer_transactions', table => {
        table.uuid('brand_id')
            .nullable()
            .alter();
    });
};
