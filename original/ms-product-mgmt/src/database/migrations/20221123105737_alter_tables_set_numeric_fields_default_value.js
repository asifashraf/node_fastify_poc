/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
 exports.up = async function(knex) {
    await knex.schema.alterTable('product_category', (table) => {
        table.integer('position').notNullable().defaultTo(0).alter()
    })

    await knex.schema.alterTable('product_specific_price', (table) => {
        table.decimal('reduction', 20, 6).notNullable().defaultTo(0).alter()
    })

    await knex.schema.alterTable('product_attributes', (table) => {
        table.decimal('price', 20, 6).notNullable().defaultTo(0).alter()
    })

    return knex.schema.alterTable('products', (table) => {
        table.integer('position').nullable().defaultTo(0).alter()
    })
    
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
    await knex.schema.alterTable('product_category', (table) => {
        table.integer('position').notNullable().alter()
    })

    await knex.schema.alterTable('product_specific_price', (table) => {
        table.decimal('reduction', 20, 6).notNullable().alter()
    })

    await knex.schema.alterTable('product_attributes', (table) => {
        table.decimal('price', 20, 6).notNullable().alter()
    })

    return knex.schema.alterTable('products', (table) => {
        table.integer('position').nullable().alter()
    })
};
