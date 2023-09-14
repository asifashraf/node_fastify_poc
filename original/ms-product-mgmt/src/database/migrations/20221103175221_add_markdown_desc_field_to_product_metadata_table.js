/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.alterTable('product_metadata', (table) => {
        table.text('markdown_desc').nullable()
        table.text('markdown_short').nullable()
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.alterTable('product_metadata', (table) => {
        table.dropColumn('markdown_desc')
        table.dropColumn('markdown_short')
    })
};
