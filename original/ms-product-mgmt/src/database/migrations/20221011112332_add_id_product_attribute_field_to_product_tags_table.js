/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.alterTable('product_tags', (table) => {
        table.uuid('id_product_attribute').nullable()
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.alterTable('product_tags', (table) => {
        table.dropColumn('id_product_attribute');
    })
};
