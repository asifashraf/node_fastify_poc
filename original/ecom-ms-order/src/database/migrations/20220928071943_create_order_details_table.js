/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('order_details', (table) => {
        table.uuid('id').primary();
        table.uuid('id_order').notNullable();
        table.uuid('id_supplier').notNullable();
        table.uuid('id_product').notNullable();
        table.uuid('id_product_attribute').notNullable();
        table.string('product_name').notNullable();
        table.string('product_reference').notNullable();
        table.integer('product_quantity').notNullable();
        table.integer('available_quantity').notNullable();
        table.decimal('unit_price_tax_excl', 20,2).notNullable();
        table.decimal('unit_price_tax_incl', 20,2).notNullable();
        table.decimal('total_price_tax_incl', 20,2).notNullable();
        table.decimal('total_price_tax_excl', 20,2).notNullable();
        table.decimal('reduction_amount_tax_excl', 20,2).nullable();
        table.decimal('reduction_amount_tax_incl', 20,2).nullable();
        table.decimal('reduction_percentage', 20,2).nullable();
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTable('order_details');
};
