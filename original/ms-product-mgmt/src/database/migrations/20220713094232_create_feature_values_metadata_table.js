/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('feature_values_metadata', (table) => {
        table.uuid('id').primary();
        table.uuid('id_feature_value').notNullable();
        table.uuid('id_lang').notNullable();
        table.string('name', 50).notNullable();
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTable('feature_values_metadata');
};
