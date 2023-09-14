/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('product_media', (table) => {
        table.uuid('id').primary();
        table.uuid('id_media').notNullable();
        table.uuid('id_product').notNullable();
        table.integer('position').notNullable().defaultTo(0);
        table.boolean('cover').defaultTo(false);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTable('product_media');
};
