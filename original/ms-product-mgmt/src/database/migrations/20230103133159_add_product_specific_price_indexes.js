/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {

    await knex.schema.table('product_specific_price', function (table) {
        table.index(['reduction']);
    });

    await knex.schema.table('product_specific_price', function (table) {
        table.index(['reduction_type']);
    });

    await knex.schema.table('product_specific_price', function (table) {
        table.index(['date_to']);
    });

    await knex.schema.table('product_specific_price', function (table) {
        table.index(['date_from']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {

    await knex.schema.table('product_specific_price', function (table) {
        table.dropIndex(['reduction']);
    });

    await knex.schema.table('product_specific_price', function (table) {
        table.dropIndex(['reduction_type']);
    });

    await knex.schema.table('product_specific_price', function (table) {
        table.dropIndex(['date_to']);
    });

    await knex.schema.table('product_specific_price', function (table) {
        table.dropIndex(['date_from']);
    });
};
