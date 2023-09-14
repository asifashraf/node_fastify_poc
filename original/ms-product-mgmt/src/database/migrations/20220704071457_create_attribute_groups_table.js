/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('attribute_groups', (table) => {
        table.uuid('id').primary();
        table.string('group_type').notNullable();
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
    return knex.schema.dropTable('attribute_groups');
};
