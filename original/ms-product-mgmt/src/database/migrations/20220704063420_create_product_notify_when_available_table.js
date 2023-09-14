/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('product_notify_when_available', (table) => {
        table.uuid('id_customer').notNullable();
        table.uuid('id_product').notNullable();
        table.uuid('id_product_attribute').notNullable();
        table.string('uuid', 255).notNullable();
        table.string('device_type', 255).notNullable();
        table.string('device_token', 255).notNullable();
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTable('product_notify_when_available');
};
