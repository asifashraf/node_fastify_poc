/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('attributes', (table) => {
        table.uuid('id').primary();
        table.uuid('id_attribute_group').notNullable();
        table.integer('position').notNullable().defaultTo(0);
        table.uuid('id_lang').notNullable();
        table.string('name', 128).notNullable();
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTable('attributes');
};
