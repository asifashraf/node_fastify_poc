/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('offers', (table) => {
        table.uuid('id').primary();
        table.string('name', 191).notNullable().index();
        table.string('offer_type', 191).notNullable().index();
        table.timestamp('date_from').notNullable().index();
        table.timestamp('date_to').notNullable().index();
        table.boolean('active').defaultTo(true);
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
    return knex.schema.dropTable('offers');
};
