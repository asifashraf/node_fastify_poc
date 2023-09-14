exports.up = function (knex) {
    return knex.schema
    .alterTable('subscriptions', table => {
        table.uuid('brand_id')
            .references('id')
            .inTable('brands')
            .index()
            .nullable();
    })
    .alterTable('subscription_customers', table => {
        table.uuid('brand_id')
            .references('id')
            .inTable('brands')
            .index()
            .nullable();
    })
};

exports.down = function (knex) {
    return knex.schema
    .alterTable('subscriptions', table => {
        table.dropColumn('brand_id');
    })
    .alterTable('subscription_customers', table => {
        table.dropColumn('brand_id');
    });
};
