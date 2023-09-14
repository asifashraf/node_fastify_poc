/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.alterTable('order_details', (table) => {
        table.float('tax_amount', 20,2).nullable();
        table.float('vat_rate').nullable();
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.alterTable('order_details', (table) => {
        table.dropColumn('tax_amount');
        table.dropColumn('vat_rate');
    })
};
