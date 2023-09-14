/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('offer_manufacturers', (table) => {
        table.uuid('id_offer').notNullable().index();
        table.uuid('id_manufacturer').notNullable().index();
        table.unique(['id_offer', 'id_manufacturer']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTable('offer_manufacturers');
};
