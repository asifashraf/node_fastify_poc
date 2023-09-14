/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('product_feedback_score', (table) => {
        table.uuid('id').primary();
        table.uuid('id_product').notNullable().index();
        table.uuid('id_order').notNullable().index();
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('deleted_at').nullable();
        table.integer('score').notNullable().index();
        table.string('comment', 191).nullable();
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTable('product_feedback_score');
};
