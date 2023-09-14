/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('order_payment', (table) => {
        table.uuid('id').primary();
        table.uuid('id_order').notNullable();
        table.string('currency').notNullable();
        table.decimal('amount',20,2).notNullable();
        table.string('transaction_id').nullable();
        table.string('payment_method').notNullable();
        table.string('card_number').nullable();
        table.string('card_brand').nullable();
        table.string('card_exp').nullable();
        table.string('card_holder').nullable();
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTable('order_payment');
};
