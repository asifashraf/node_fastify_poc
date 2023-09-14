/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable("order_carrier", (table) => {
        table.uuid("id").primary();
        table.uuid("id_order").notNullable();
        table.uuid("id_carrier").notNullable();
        table.decimal("shipping_amount_tax_excl", 20, 2).notNullable();
        table.decimal("shipping_amount_tax_incl", 20, 2).notNullable();
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTable("order_carrier");
};
