exports.up = knex =>
    knex.schema.table('subscriptions', table => {
        table.bigInteger('period_in_minutes');
    });

exports.down = knex =>
    knex.schema.table('subscriptions', table => {
        table.dropColumn('period_in_minutes');
    });
