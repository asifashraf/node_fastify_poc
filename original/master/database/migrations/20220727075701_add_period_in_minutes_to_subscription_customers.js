exports.up = knex =>
    knex.schema.table('subscription_customers', table => {
        table.bigInteger('period_in_minutes');
    });

exports.down = knex =>
    knex.schema.table('subscription_customers', table => {
        table.dropColumn('period_in_minutes');
    });
