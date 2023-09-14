/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('order_history', (table) => {
        table.uuid('id').primary();
        table.uuid('id_order').notNullable();
        table.uuid('id_employee').nullable();
        table.uuid('id_order_state').notNullable();
        table.string('comment').nullable();
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTable('order_history');
};
