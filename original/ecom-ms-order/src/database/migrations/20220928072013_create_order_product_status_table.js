/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('order_product_status', (table) => {
        table.uuid('id').primary();
        table.uuid('id_order').notNullable();
        table.uuid('id_product').notNullable();
        table.string('status').notNullable();
        table.string('waybill_status').nullable();
        table.string('waybill_number').nullable();
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('deleted_at').nullable();
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTable('order_product_status');
};
