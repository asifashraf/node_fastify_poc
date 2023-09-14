/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('feature_values', (table) => {
        table.uuid('id').primary();
        table.uuid('id_feature').notNullable();
        table.uuid('id_lang').notNullable();
        table.string('name', 128).notNullable();
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTable('feature_values');
};
