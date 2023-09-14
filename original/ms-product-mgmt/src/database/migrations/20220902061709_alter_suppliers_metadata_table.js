/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    await knex.schema.alterTable('suppliers', (table) => {
        table.dropColumn('description');
    })

    return knex.schema.alterTable('suppliers_metadata', (table) => {
        table.string('description');
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
    await knex.schema.alterTable('suppliers', (table) => {
        table.string('description');
    })
    return knex.schema.alterTable('suppliers_metadata', (table) => {
        table.dropColumn('description');
    })
};
