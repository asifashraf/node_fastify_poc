/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('feeds_category_mapping', (table) => {
        table.uuid('id').primary();
        table.uuid('id_parent').notNullable();
        table.uuid('id_category').notNullable();
        table.string('fb_category').notNullable();
        table.string('google_category').notNullable();
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('deleted_at').nullable();
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTable('feeds_category_mapping');
};
