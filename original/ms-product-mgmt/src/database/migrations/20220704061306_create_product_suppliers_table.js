/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('product_suppliers', (table) => {
        table.uuid('id').primary();
        table.uuid('id_product').notNullable();
        table.uuid('id_product_attribute').notNullable();
        table.uuid('id_supplier').notNullable().index();
        table.string('product_supplier_reference', 128).notNullable().index();
        table.decimal('product_price_tax_excl', 20,6).notNullable().defaultTo(0).index();
        table.boolean('is_default').defaultTo(false);
        table.boolean('active').defaultTo(true);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTable('product_suppliers');
};
