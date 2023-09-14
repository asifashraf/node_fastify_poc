exports.up = function (knex) {
    return knex.schema.alterTable('tags', (table) => {
        table.boolean('is_filter').notNullable()
            .defaultTo(false);
    });
};
exports.down = function (knex) {
    return knex.schema.alterTable('tags', (table) => {
        table.dropColumn('is_filter');
    });
};