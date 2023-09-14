/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('supplier_locations', (table) => {
        table.uuid('id').primary();
        table.uuid('id_supplier').notNullable();
        table.string('first_name', 50).notNullable();
        table.string('last_name', 50).notNullable();
        table.string('alias', 50).notNullable();
        table.string('company', 100);
        table.text('address').notNullable();
        table.uuid('id_country').notNullable();
        table.uuid('id_city').notNullable();
        table.string('phone', 50).notNullable();
        table.string('mobile', 50);
        table.string('postcode', 50)
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
    return knex.schema.dropTable('supplier_locations');
};
