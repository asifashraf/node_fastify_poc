const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = function (knex) {
    return knex.schema.createTable('home_page_sections', table => {
        table.uuid('id').primary().notNullable();
        table.string('ref_query_id');
        table.string('header').defaultTo('');
        table.string('header_ar');
        table.string('header_tr');
        table.enu('item_type', ['SEARCH_ITEM', 'REORDER_ITEM', 'ORDER_TRACKING_ITEM', 'CAROUSEL_ITEM', 'ICON_BUTTON_ITEM', 'CARD_LIST_ITEM', 'BORDERED_CARD_ITEM'], {
            useNative: true,
            enumName: 'home_page_section_item_type_enum',
        });
        table
            .timestamp('created')
            .notNullable()
            .defaultTo(knex.fn.now());
        table
            .timestamp('updated')
            .notNullable()
            .defaultTo(knex.fn.now());
    }).then(() => knex.raw(onUpdateTrigger('home_page_sections')));
};

exports.down = async function (knex) {
    await knex.schema.dropTable('home_page_sections');
};
