/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    await knex.schema.alterTable('attributes', (table) => {
        table.dropPrimary()
    })

    await knex.schema.alterTable('attribute_groups', (table) => {
        table.dropPrimary()
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {

};
