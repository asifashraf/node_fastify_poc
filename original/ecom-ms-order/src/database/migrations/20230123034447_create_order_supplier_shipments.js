/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('order_supplier_shipments', (table) => {
        table.uuid('id').primary();
        table.uuid('id_order').notNullable();
        table.uuid('id_supplier').notNullable();
        table.uuid('id_carrier_partner').nullable();
        table.string('tracking_url').nullable();
        table.string('tracking_number').notNullable();
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('deleted_at').nullable();
        table.unique(['id_order', 'id_supplier']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTable('order_supplier_shipments');
};
