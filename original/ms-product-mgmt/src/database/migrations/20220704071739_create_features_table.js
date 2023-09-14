/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('features', (table) => {
        table.uuid('id').primary();
        table.uuid('id_feature_group').notNullable();
        table.uuid('id_lang').notNullable();
        table.integer('position').notNullable().defaultTo(0);
        table.string('name', 128).notNullable();
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTable('features');
};
