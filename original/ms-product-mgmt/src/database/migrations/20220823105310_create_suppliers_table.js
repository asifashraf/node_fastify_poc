/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.createTable('suppliers', (table) => {
        table.uuid('id').primary();
        table.boolean('active').defaultTo(true);
        table.string('vat_number', 100);
        table.string('phone', 50).notNullable();
        table.string('email', 50).notNullable();
        table.string('verification_code', 50)
        table.string('commission', 2)
        table.boolean('is_verified').defaultTo(false);
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('deleted_at')
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTable('suppliers');
};
