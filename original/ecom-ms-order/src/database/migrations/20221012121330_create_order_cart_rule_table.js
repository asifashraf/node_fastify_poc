/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.createTable("order_cart_rule", (table) => {
        table.uuid("id").primary();
        table.uuid("id_order").notNullable();
        table.uuid("id_cart_rule").notNullable();
        table.string("code").notNullable();
        table.decimal("cart_rule_amount_tax_excl", 20, 2).notNullable();
        table.decimal("cart_rule_amount_tax_incl", 20, 2).notNullable();
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTable("order_cart_rule");
};
