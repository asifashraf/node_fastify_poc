/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('supplier_bank_details', (table) => {
        table.uuid('id').primary();
        table.uuid('id_supplier').notNullable();
        table.string('account_title', 100).notNullable();
        table.string('account_number', 50).notNullable();
        table.string('iban_number', 100).notNullable();
        table.string('swift_code', 50);
        table.text('address')
        table.boolean('active').notNullable().defaultTo(true);
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
    return knex.schema.dropTable('supplier_bank_details');
};
