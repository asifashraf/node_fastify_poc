/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
 exports.up = async function(knex) {
    return knex.schema.alterTable('suppliers_metadata', (table) => {
        table.text('description').alter();
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
    return await knex.schema.alterTable('suppliers_metadata', (table) => {
        table.string('description').alter()
    })
};
