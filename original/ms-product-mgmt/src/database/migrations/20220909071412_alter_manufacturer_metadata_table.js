/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.alterTable('manufacturers_metadata', (table) => {
        table.text('description').alter();
        table.string('image').nullable();
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
    return await knex.schema.alterTable('manufacturers_metadata', (table) => {
        table.dropColumn('image');
        table.string('description').alter();
    })
};

