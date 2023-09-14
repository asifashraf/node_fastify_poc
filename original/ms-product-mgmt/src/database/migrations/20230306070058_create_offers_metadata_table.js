/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('offers_metadata', (table) => {
        table.uuid('id').primary();
        table.uuid('id_offer').notNullable();
        table.uuid('id_lang').notNullable();
        table.string('offer_tag', 191).notNullable().index();
        table.text('offer_desc').nullable().index();
        table.string('offer_icon').nullable().index();
        table.string('offer_desc_icon').nullable();
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTable('offers_metadata');
};
