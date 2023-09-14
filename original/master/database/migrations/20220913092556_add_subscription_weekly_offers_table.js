const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = function (knex) {
    return knex.schema.createTable('subscription_weekly_offers', table => {
        table.uuid('id').primary().notNullable();
        table.uuid('brand_id').references('id')
            .inTable('brands')
            .index()
            .notNullable();
        table.string('image_url').notNullable();
        table.string('image_url_ar');
        table.string('image_url_tr');
        table.uuid('country_id').references('id')
            .inTable('countries')
            .index()
            .notNullable();
        table
            .timestamp('created')
            .notNullable()
            .defaultTo(knex.fn.now());
        table
            .timestamp('updated')
            .notNullable()
            .defaultTo(knex.fn.now());
    }).then(() => knex.raw(onUpdateTrigger('subscription_weekly_offers')));
};

exports.down = async function (knex) {
    await knex.schema.dropTable('subscription_weekly_offers');
};
