const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = function (knex) {
    return knex.schema.createTable('drivers', table => {
        table.uuid('id').primary().notNullable();
        table.string('first_name', 140).notNullable();
        table.string('last_name', 140).notNullable();
        table.string('phone_number', 140).notNullable();
        table.string('phone_country').notNullable();
        table
            .timestamp('created')
            .notNullable()
            .defaultTo(knex.fn.now());
        table
            .timestamp('updated')
            .notNullable()
            .defaultTo(knex.fn.now());
    }).then(() => knex.raw(onUpdateTrigger('drivers')));
};

exports.down = async function (knex) {
    await knex.schema.dropTable('drivers');
};
