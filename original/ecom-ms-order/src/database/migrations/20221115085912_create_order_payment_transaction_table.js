/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('order_payment_transaction', (table) => {
        table.uuid('id').primary();
        table.uuid('id_order').notNullable();
        table.string('transaction_id').notNullable()
        table.string('payment_reference').nullable()
        table.boolean('approved').defaultTo(false)
        table.string('payment_status')
        table.string('customer_id')
        table.string('customer_name')
        table.string('customer_email')
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTable("order_payment_transaction");
};
