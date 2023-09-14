/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.alterTable('order_payment', (table) => {
        table.float('credit_used', 20,2).notNullable().defaultTo(0.00);
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.alterTable('order_payment', (table) => {
        table.dropColumn('credit_used');
    })
};
