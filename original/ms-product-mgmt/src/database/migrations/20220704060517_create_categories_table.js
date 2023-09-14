/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
const config = require("../../globals/config");
exports.up = function(knex) {
    return knex.schema.createTable('categories', (table) => {
        table.uuid('id').primary();
        table.uuid('id_parent').notNullable().defaultTo(config.default_uuid);
        table.boolean('active').defaultTo(true);
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('deleted_at').nullable();
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTable('categories');
};
