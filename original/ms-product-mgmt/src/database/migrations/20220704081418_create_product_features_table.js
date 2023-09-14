/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('product_features', (table) => {
        table.uuid('id_product').notNullable();
        table.uuid('id_feature').notNullable();
        table.uuid('id_feature_group').notNullable();
        table.uuid('id_feature_value').notNullable();
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTable('product_features');
};
