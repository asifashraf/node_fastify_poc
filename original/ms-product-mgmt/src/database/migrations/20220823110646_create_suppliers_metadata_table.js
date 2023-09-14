/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('suppliers_metadata', (table) => {
        table.uuid('id').primary();
        table.uuid('id_supplier').notNullable();
        table.uuid('id_lang').notNullable();
        table.string('name', 50).notNullable();
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTable('suppliers_metadata');
};
