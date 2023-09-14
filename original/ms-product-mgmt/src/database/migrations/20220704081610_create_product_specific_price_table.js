/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
const config = require("../../globals/config");
exports.up = function(knex) {
    return knex.schema.createTable('product_specific_price', (table) => {
        table.uuid('id').primary();
        table.uuid('id_cart').notNullable().defaultTo(config.default_uuid);
        table.uuid('id_product').notNullable();
        table.uuid('id_product_attribute').notNullable().defaultTo(config.default_uuid);
        table.uuid('id_supplier').notNullable().defaultTo(config.default_uuid);
        table.uuid('id_country').notNullable().defaultTo(config.default_uuid);
        table.uuid('id_currency').notNullable().defaultTo(config.default_uuid);
        table.uuid('id_customer').notNullable().defaultTo(config.default_uuid);
        table.integer('from_quantity').notNullable().defaultTo(1);
        table.decimal('reduction', 20, 6).notNullable();
        table.string('reduction_type').notNullable();
        table.timestamp('date_from').notNullable();
        table.timestamp('date_to').notNullable();
        table.boolean('active').defaultTo(true);
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
    return knex.schema.dropTable('product_specific_price');
};
