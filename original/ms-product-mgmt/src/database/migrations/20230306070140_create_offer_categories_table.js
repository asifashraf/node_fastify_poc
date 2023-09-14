/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('offer_categories', (table) => {
        table.uuid('id_offer').notNullable().index();
        table.uuid('id_category').notNullable().index();
        table.unique(['id_offer', 'id_category']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTable('offer_categories');
};
