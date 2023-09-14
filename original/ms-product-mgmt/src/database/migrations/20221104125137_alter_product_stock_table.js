/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
 exports.up = function(knex) {
    return knex.schema.alterTable('product_stock', (table) => {
        table.unique(['id_product','id_product_attribute']);
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.alterTable('product_stock', (table) => {
        table.dropUnique(['id_product','id_product_attribute']);
    })
};
