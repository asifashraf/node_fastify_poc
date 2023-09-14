exports.up = function (knex) {
    return knex.schema.alterTable('home_page_icon_button_item_settings', (table) => {
        table.boolean('is_sticky').notNullable()
            .defaultTo(false);
    });
};
exports.down = function (knex) {
    return knex.schema.alterTable('home_page_icon_button_item_settings', (table) => {
        table.dropColumn('is_sticky');
    });
};