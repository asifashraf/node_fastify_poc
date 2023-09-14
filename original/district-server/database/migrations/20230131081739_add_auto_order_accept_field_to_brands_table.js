exports.up = function (knex) {
    return knex.schema
        .alterTable('brands', (table) => {
            table.boolean('auto_order_accept').notNullable()
                .defaultTo(false);
        })
        .alterTable('brand_locations', (table) => {
            table.boolean('auto_order_accept').notNullable()
                .defaultTo(false);
        });
};
exports.down = function (knex) {
    return knex.schema
        .alterTable('brands', (table) => {
            table.dropColumn('auto_order_accept');
        })
        .alterTable('brand_locations', (table) => {
            table.dropColumn('auto_order_accept');
        })
};