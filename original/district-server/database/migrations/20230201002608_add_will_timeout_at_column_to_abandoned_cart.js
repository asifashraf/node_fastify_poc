exports.up = function (knex) {
    return knex.schema.alterTable('abandoned_carts', (table) => {
        table
            .timestamp('will_timeout_at');
    });
};
exports.down = function (knex) {
    return knex.schema.alterTable('abandoned_carts', (table) => {
        table.dropColumn('will_timeout_at');
    });
};