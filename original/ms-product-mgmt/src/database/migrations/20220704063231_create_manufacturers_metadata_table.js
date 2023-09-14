/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('manufacturers_metadata', (table) => {
        table.uuid('id').primary();
        table.uuid('id_manufacturer').notNullable();
        table.uuid('id_lang').notNullable();
        table.string('meta_value').notNullable();
        table.string('meta_key', 128).notNullable();
        table.string('meta_type', 128).notNullable();
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTable('manufacturers_metadata');
};
