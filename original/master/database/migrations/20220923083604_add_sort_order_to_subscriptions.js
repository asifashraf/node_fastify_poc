exports.up = knex =>
    knex.schema.table('subscriptions', table => {
        table.integer('sort_order');
    });

exports.down = knex =>
    knex.schema.table('subscriptions', table => {
        table.integer('sort_order');
    });
