/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('orders', (table) => {
        table.uuid('id').primary();
        table.string('reference').notNullable();
        table.uuid('id_customer').notNullable();
        table.uuid('id_cart').notNullable();
        table.uuid('id_address_delivery').notNullable();
        table.uuid('id_address_invoice').notNullable();
        table.uuid('current_state').notNullable();
        table.uuid('id_carrier').notNullable();
        table.string('payment_status').notNullable();
        table.decimal('total_products_tax_excl').notNullable();
        table.decimal('total_products_tax_incl', 20,2).notNullable();
        table.decimal('total_shipping_tax_excl', 20,2).notNullable();
        table.decimal('total_shipping_tax_incl', 20,2).notNullable();
        table.decimal('total_discounts_tax_excl', 20,2).notNullable();
        table.decimal('total_discounts_tax_incl', 20,2).notNullable();
        table.decimal('total_paid_tax_excl', 20,2).notNullable();
        table.decimal('total_paid_tax_incl', 20,2).notNullable();
        table.boolean('is_valid').defaultTo(false);
        table.string('eta').nullable();
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTable('orders');
};
