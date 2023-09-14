/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.alterTable('order_carrier', (table) => {
        table.uuid('id_carrier_partner').nullable();
        table.string('tracking_url').nullable
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.alterTable('order_carrier', (table) => {
        table.dropColumn('id_carrier_partner');
        table.dropColumn('tracking_url');
    })
};
