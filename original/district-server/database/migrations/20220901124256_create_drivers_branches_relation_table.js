const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = function (knex) {
    return knex.schema.createTable('drivers_branches', table => {
        table.uuid('id').primary().notNullable();
        table.uuid('driver_id').references('id').inTable('drivers').index().notNullable();
        table.uuid('branch_id').references('id').inTable('brand_locations').index().notNullable();
        table
            .timestamp('created')
            .notNullable()
            .defaultTo(knex.fn.now());
        table
            .timestamp('updated')
            .notNullable()
            .defaultTo(knex.fn.now());
    }).then(() => knex.raw(onUpdateTrigger('drivers_branches')));
};

exports.down = async function (knex) {
    await knex.schema.dropTable('drivers_branches');
};
