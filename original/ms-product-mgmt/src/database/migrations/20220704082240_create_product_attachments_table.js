/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('product_attachments', (table) => {
        table.uuid('id').primary();
        table.uuid('id_product').notNullable();
        table.uuid('id_lang').notNullable();
        table.string('file', 191).notNullable();
        table.string('file_name', 191).notNullable();
        table.bigInteger('file_size').notNullable();
        table.string('mime', 128).notNullable();
        table.string('name', 50).notNullable();
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
    return knex.schema.dropTable('product_attachments');
};
