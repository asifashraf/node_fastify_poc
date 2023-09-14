const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = function (knex) {
    return knex.schema.createTable('home_page_carousel_items', table => {
        table.uuid('id').primary().notNullable();
        table.string('image').defaultTo('');
        table.string('image_ar');
        table.string('image_tr');
        table.string('deeplink');
        table.enu('status', ['ACTIVE', 'INACTIVE', 'DELETED'], {
            useNative: true,
            enumName: 'home_page_carousel_item_status_enum',
        });
        table
            .timestamp('created')
            .notNullable()
            .defaultTo(knex.fn.now());
        table
            .timestamp('updated')
            .notNullable()
            .defaultTo(knex.fn.now());
    }).then(() => knex.raw(onUpdateTrigger('home_page_carousel_items')));
};

exports.down = async function (knex) {
    await knex.schema.dropTable('home_page_carousel_items');
};
