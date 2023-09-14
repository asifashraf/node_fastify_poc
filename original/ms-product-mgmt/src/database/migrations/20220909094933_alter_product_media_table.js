/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.alterTable('product_media', (table) => {
        table.string('image').nullable();
        table.dropColumn('id_media');
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
    return await knex.schema.alterTable('product_media', (table) => {
        table.dropColumn('image');
    })
};
