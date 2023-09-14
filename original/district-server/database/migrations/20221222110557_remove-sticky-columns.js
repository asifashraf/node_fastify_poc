exports.up = function (knex) {
    return knex.schema.alterTable('home_page_section_settings', (table) => {
        table.dropColumn('is_sticky');
        table.dropColumn('sticky_count');
    });
};
exports.down = function (knex) {
    return knex.schema.alterTable('home_page_section_settings', (table) => {
        table.boolean('is_sticky').notNullable()
            .defaultTo(false);
        table.integer('sticky_count');
    });
};