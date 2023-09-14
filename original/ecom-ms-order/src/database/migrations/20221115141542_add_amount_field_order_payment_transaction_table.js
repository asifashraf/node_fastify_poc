/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.alterTable('order_payment_transaction', (table) => {
        table.decimal('amount', 20,2).notNullable().defaultTo('0.00');
        table.string('currency').notNullable().defaultTo('AED');
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.alterTable('order_payment_transaction', (table) => {
        table.dropColumn('amount');
        table.dropColumn('currency');
    })
};
