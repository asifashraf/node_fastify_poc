const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = function (knex) {
    return knex.schema.createTable('home_page_icon_button_items', table => {
        table.uuid('id').primary().notNullable();
        table.string('image').defaultTo('');
        table.string('title').defaultTo('');
        table.string('title_ar');
        table.string('title_tr');
        table.string('deeplink');
        table
            .timestamp('created')
            .notNullable()
            .defaultTo(knex.fn.now());
        table
            .timestamp('updated')
            .notNullable()
            .defaultTo(knex.fn.now());
    }).then(() => knex.raw(onUpdateTrigger('home_page_icon_button_items')));
};

exports.down = async function (knex) {
    await knex.schema.dropTable('home_page_icon_button_items');
};
