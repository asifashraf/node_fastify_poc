/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('product_attributes', (table) => {
        table.uuid('id').primary();
        table.uuid('id_product').notNullable();
        table.string('reference', 128).notNullable();
        table.decimal('price', 20,6).notNullable();
        table.boolean('default_on').defaultTo(false);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTable('product_attributes');
};
