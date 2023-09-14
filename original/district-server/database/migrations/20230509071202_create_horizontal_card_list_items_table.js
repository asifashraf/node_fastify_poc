const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = function (knex) {
    return knex.schema.createTable('home_page_horizontal_card_list_items', table => {
        table.uuid('id').primary().notNullable();
        table.uuid('section_id')
            .references('id')
            .inTable('home_page_sections')
            .index();
        table.uuid('item_id')
            .notNullable();
        table.enu('item_type', ['BRAND', 'BRAND_LOCATION', 'SUBSCRIPTION'], {
            useNative: true,
            enumName: 'home_page_horizontal_card_list_item_type_enum',
            })
            .notNullable();
        table.enu('status', ['ACTIVE', 'INACTIVE', 'DELETED'], {
            useNative: true,
            enumName: 'home_page_horizontal_card_list_item_status_enum',
            })
            .notNullable()
            .defaultTo('ACTIVE');     
        table
            .timestamp('created')
            .notNullable()
            .defaultTo(knex.fn.now());
        table
            .timestamp('updated')
            .notNullable()
            .defaultTo(knex.fn.now());
    }).then(() => knex.raw(onUpdateTrigger('home_page_horizontal_card_list_items')));
};

exports.down = async function (knex) {
    await knex.schema.dropTable('home_page_horizontal_card_list_items');
};
