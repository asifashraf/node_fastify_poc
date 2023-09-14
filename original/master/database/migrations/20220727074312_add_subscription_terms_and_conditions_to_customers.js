exports.up = knex =>
    knex.schema.table('customers', table => {
        table
            .boolean('is_subscription_terms_and_conditions_accepted')
            .notNullable()
            .defaultTo(false);
        table.dateTime('subscription_terms_and_conditions_accept_date').nullable();
    });

exports.down = knex =>
    knex.schema.table('customers', table => {
        table.dropColumn('is_subscription_terms_and_conditions_accepted');
        table.dropColumn('subscription_terms_and_conditions_accept_date');
    });
