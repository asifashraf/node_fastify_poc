/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.alterTable('suppliers', (table) => {
        table.string('service_email', 50);
        table.string('service_phone', 50);
        table.string('description');
        table.double('commission').alter();
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.alterTable('suppliers', (table) => {
        table.dropColumn('description');
        table.dropColumn('service_phone');
        table.dropColumn('service_email');
        table.string('commission').alter();
    })
};
