/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.alterTable('order_product_status', (table) => {
        table.uuid('id_product_attribute').nullable()
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.alterTable('order_product_status', (table) => {
        table.dropColumn('id_product_attribute');
    })
};
