/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('languages', (table) => {
        table.uuid('id').primary();
        table.string('name').notNullable().index();
        table.boolean('active').defaultTo(true);
        table.string('iso_code', 50).notNullable().index();
        table.string('locale', 50).nullable().defaultTo('en');
        table.date('date_format', ).nullable();
        table.boolean('is_rtl').defaultTo(false);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTable('languages');
};
