
const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = function (knex) {
    return knex.schema.createTable('badges', table => {
        table.uuid('id').primary().notNullable();
        table.enu('type', ['SUBSCRIPTION_MOST_POPULAR'], {
            useNative: true,
            enumName: 'badge_type_enum',
        }).notNullable();
        table.string('name').notNullable();
        table.string('name_ar'); 
        table.string('name_tr');   
        table.string('text');
        table.string('text_ar');
        table.string('text_tr');
        table.string('text_color');
        table.string('icon_url');
        table.string('icon_url_ar');
        table.string('icon_url_tr');
        table.string('background_color');
        table.string('status').notNullable();
        table
            .timestamp('created')
            .notNullable()
            .defaultTo(knex.fn.now());
        table
            .timestamp('updated')
            .notNullable()
            .defaultTo(knex.fn.now());
    }).then(() => knex.raw(onUpdateTrigger('badges')));
};

exports.down = async function (knex) {
    await knex.schema.dropTable('badges');
};

