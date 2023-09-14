exports.up = function(knex) {
    return knex.schema.table('order_set_statuses', table => {
        table.string('client_name').nullable();
    });
};

exports.down = function(knex) {
    return knex.schema.table('order_set_statuses', table => {
        table.dropColumn('client_name');
    })
};
