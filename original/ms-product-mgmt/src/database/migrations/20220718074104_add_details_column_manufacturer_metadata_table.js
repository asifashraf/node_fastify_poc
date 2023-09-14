/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.table('manufacturers_metadata', table => {
        table.string('name', 100).notNullable().index();
        table.string('description', 255).nullable().index();
        table.string('meta_title', 50).nullable();
        table.string('meta_keywords', 50).nullable();
        table.string('meta_description', 255).nullable();
        table.dropColumn('meta_key');
        table.dropColumn('meta_type');
        table.dropColumn('meta_value');
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
};
