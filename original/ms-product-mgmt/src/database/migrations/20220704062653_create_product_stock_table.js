/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
const config = require("../../globals/config");
exports.up = function(knex) {
    return knex.schema.createTable('product_stock', (table) => {
        table.uuid('id').primary();
        table.uuid('id_product').notNullable();
        table.uuid('id_product_attribute').notNullable().defaultTo(config.default_uuid);
        table.integer('quantity').notNullable().defaultTo(0).index();
        table.uuid('id_supplier').notNullable();
        table.boolean('allow_backorder').defaultTo(false);
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
    return knex.schema.dropTable('product_stock');
};
