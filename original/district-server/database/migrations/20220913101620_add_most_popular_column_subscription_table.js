exports.up = function (knex) {
    return knex.schema
    .alterTable('subscriptions', table => {
        table.boolean('most_popular')
            .default(false)
            .notNullable();
    })
};

exports.down = function (knex) {
    return knex.schema
    .alterTable('subscriptions', table => {
        table.dropColumn('most_popular');
    })
};
