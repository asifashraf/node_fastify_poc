/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
 exports.up = function(knex) {
    return knex.schema.alterTable('product_metadata', (table) => {
        table.text('description').alter();
        table.text('short_description').alter();
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.alterTable('product_metadata', (table) => {
        table.string('description').alter();
        table.string('short_description', 100).alter();
    })
};
