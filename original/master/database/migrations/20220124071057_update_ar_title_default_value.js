
exports.up = function(knex) {
    return knex.schema.alterTable('customer_addresses_fields', table => {
        table.string('title_ar').default('').notNullable().alter();
    })
    
};

exports.down = function(knex) {
    return knex.schema.alterTable('customer_addresses_fields', table => {
        table.string('title_ar').notNullable().alter();
    })
};
