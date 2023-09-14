/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    await knex.schema.table('manufacturers_metadata', function (table) {
        table.index(['id_manufacturer']);
    });

    await knex.schema.table('manufacturers_metadata', function (table) {
        table.index(['id_lang']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
    await knex.schema.table('manufacturers_metadata', function (table) {
        table.dropIndex(['id_lang']);
    });
};
