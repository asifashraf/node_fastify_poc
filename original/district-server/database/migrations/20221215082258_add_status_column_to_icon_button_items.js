exports.up = function (knex) {
    return knex.schema.alterTable('home_page_icon_button_items', (table) => {
        table.enu('status', ['ACTIVE', 'INACTIVE', 'DELETED'], {
            useNative: true,
            enumName: 'home_page_icon_button_item_status_enum',
        });
    });
};
exports.down = function (knex) {
    return knex.schema.alterTable('home_page_icon_button_items', (table) => {
        table.dropColumn('status');
    });
};