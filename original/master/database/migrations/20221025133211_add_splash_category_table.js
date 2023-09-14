const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = function (knex) {
    return knex.schema.createTable('splash_category', table => {
        table.uuid('id').primary().notNullable();
        table.string('name').notNullable();
        table.boolean('isActive');
        table
            .timestamp('created')
            .notNullable()
            .defaultTo(knex.fn.now());
        table
            .timestamp('updated')
            .notNullable()
            .defaultTo(knex.fn.now());
    }).then(() => knex.raw(onUpdateTrigger('splash_category')));
};

exports.down = async function (knex) {
    await knex.schema.dropTable('splash_category');
};
