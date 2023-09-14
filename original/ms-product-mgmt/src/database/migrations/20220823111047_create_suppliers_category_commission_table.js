/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('suppliers_category_commission', (table) => {
        table.uuid('id').primary();
        table.uuid('id_category').notNullable();
        table.uuid('id_supplier').notNullable();
        table.string('commission_percentage', 50).notNullable();
        table.unique(['id_category', 'id_supplier']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTable('suppliers_category_commission');  
};
