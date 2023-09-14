/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    await knex.schema.table('product_attribute_media', function (table) {
        table.index(['id_product_attribute']);
    });

    await knex.schema.table('product_attribute_media', function (table) {
        table.index(['image']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
    await knex.schema.table('product_attribute_media', function (table) {
        table.dropIndex(['id_product_attribute']);
    });

    await knex.schema.table('product_attribute_media', function (table) {
        table.dropIndex(['image']);
    });
};
