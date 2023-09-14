/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
 exports.up = function(knex) {
    return knex.schema.alterTable('supplier_locations', (table) => {
        table.renameColumn('name_country', 'country_name')
        table.renameColumn('name_city', 'city_name')
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.alterTable('supplier_locations', (table) => {
        table.renameColumn('country_name', 'name_country')
        table.renameColumn('city_name', 'name_city')
    })
};
