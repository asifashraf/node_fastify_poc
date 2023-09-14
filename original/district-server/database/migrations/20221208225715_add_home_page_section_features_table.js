const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = function (knex) {
    return knex.schema.createTable('home_page_section_settings', table => {
        table.uuid('id').primary().notNullable();
        table.uuid('section_id')
            .references('id')
            .inTable('home_page_sections')
            .index();
        table.uuid('country_id')
            .references('id')
            .inTable('countries')
            .index();
        table.integer('sort_order');
        table.boolean('is_must').notNullable()
            .defaultTo(false);
        table.boolean('is_auth_required').notNullable()
            .defaultTo(false);
        table.boolean('is_location_based').notNullable()
            .defaultTo(false);
        table.boolean('is_paginated').notNullable()
            .defaultTo(false);
        table.integer('per_page');
        table.boolean('is_sticky').notNullable()
            .defaultTo(false);
        table.integer('sticky_count');
        table
            .timestamp('created')
            .notNullable()
            .defaultTo(knex.fn.now());
        table
            .timestamp('updated')
            .notNullable()
            .defaultTo(knex.fn.now());
    }).then(() => knex.raw(onUpdateTrigger('home_page_section_settings')));
};

exports.down = async function (knex) {
    await knex.schema.dropTable('home_page_section_settings');
};
