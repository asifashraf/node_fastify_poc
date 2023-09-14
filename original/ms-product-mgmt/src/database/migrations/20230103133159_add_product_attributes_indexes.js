/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    await knex.schema.table('product_attributes', function (table) {
        table.index(['id_product']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {

    await knex.schema.table('product_attributes', function (table) {
        table.dropIndex(['id_product']);
    });
};
