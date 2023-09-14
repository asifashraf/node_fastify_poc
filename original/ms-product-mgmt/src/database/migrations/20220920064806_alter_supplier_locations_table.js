/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.alterTable('supplier_locations', (table) => {
        table.string('alias', 50).nullable().alter();
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.alterTable('supplier_locations', (table) => {
        table.string('alias', 50).notNullable().alter();
    })
};
