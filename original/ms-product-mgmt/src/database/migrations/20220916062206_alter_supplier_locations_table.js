/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.alterTable('supplier_locations', (table) => {
        table.string('name_country', 100);
        table.string('name_city', 100);
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.alterTable('supplier_locations', (table) => {
        table.dropColumn('name_country');
        table.dropColumn('name_city');
    })
};
