/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('feature_groups', (table) => {
        table.uuid('id').primary();
        table.uuid('id_lang').notNullable();
        table.boolean('status').defaultTo(true);
        table.string('name', 128).notNullable();
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTable('feature_groups');
};
