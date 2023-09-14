const { OrderRatingStatus } = require('../../src/schema/root/enums');

exports.up = function (knex) {
    return knex.schema.alterTable('order_sets', tableBuilder => {
        tableBuilder.enu('rating_status', Object.values(OrderRatingStatus), {
            useNative: true,
            enumName: 'order_rating_status_enum',
        })
            .notNullable()
            .defaultTo(OrderRatingStatus.PENDING);
    });
};

exports.down = function (knex) {
    return knex.schema.alterTable('order_sets', tableBuilder => {
        tableBuilder.dropColumn('rating_status');
    });
};