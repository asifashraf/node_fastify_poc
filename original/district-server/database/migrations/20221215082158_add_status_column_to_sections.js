exports.up = function (knex) {
    return knex.schema.alterTable('home_page_sections', (table) => {
        table.enu('status', ['ACTIVE', 'INACTIVE', 'DELETED'], {
            useNative: true,
            enumName: 'home_page_section_status_enum',
        });
    });
};
exports.down = function (knex) {
    return knex.schema.alterTable('home_page_sections', (table) => {
        table.dropColumn('status');
    });
};