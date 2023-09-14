/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('product_countries', (table) => {
        table.uuid('id_product').notNullable();
        table.uuid('id_country').notNullable();
        table.unique(['id_product', 'id_country']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTable('product_countries');
};
