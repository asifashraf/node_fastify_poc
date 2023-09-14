const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = function (knex) {
    return knex.schema.createTable('home_page_icon_button_item_settings', table => {
        table.uuid('id').primary().notNullable();
        table.uuid('item_id')
            .references('id')
            .inTable('home_page_icon_button_items')
            .index();
        table.uuid('country_id')
            .references('id')
            .inTable('countries')
            .index();
        table.integer('sort_order');
        table
            .timestamp('created')
            .notNullable()
            .defaultTo(knex.fn.now());
        table
            .timestamp('updated')
            .notNullable()
            .defaultTo(knex.fn.now());
    }).then(() => knex.raw(onUpdateTrigger('home_page_icon_button_item_settings')));
};

exports.down = async function (knex) {
    await knex.schema.dropTable('home_page_icon_button_item_settings');
};
