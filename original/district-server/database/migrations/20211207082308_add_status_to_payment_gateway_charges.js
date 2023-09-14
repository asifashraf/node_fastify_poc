const { statusTypes } = require('./../../src/schema/root/enums');

exports.up = function(knex) {
    return knex.schema.table('payment_gateway_charges', table => {
        table
            .string('status')
            .defaultTo(statusTypes.ACTIVE)
            .notNullable();
    })
};
  
exports.down = function(knex) {
    return knex.schema.table('payment_gateway_charges', table => {
        table.dropColumn('status');
    });
};
