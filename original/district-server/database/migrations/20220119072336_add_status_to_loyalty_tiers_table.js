
exports.up = function(knex) {
    return knex.schema.table('loyalty_tiers', table => {
        table.string('status').defaultTo('ACTIVE').notNullable();
    });
};

exports.down = function(knex) {
    return knex.schema.table('loyalty_tiers', table => {
        table.dropColumn('status');
    })
};