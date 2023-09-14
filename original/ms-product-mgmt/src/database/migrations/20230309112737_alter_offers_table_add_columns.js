/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.alterTable('offers', (table) => {
        table.string('fileName')
        table.boolean('exclude_with_existing_offers').defaultTo(false)
        table.boolean('exclude_with_existing_discounts').defaultTo(false)
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.alterTable('offers', (table) => {
        table.dropColumn('fileName');
        table.dropColumn('exclude_with_existing_offers');
        table.dropColumn('exclude_with_existing_discounts');
    })
};