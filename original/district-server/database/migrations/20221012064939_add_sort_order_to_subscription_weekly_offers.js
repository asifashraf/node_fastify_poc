exports.up = knex =>
    knex.schema.alterTable('subscription_weekly_offers', table => {
        table
            .integer('sort_order')
            .default(0)
            .notNullable();
        table.index('sort_order', 'idx-subscription_weekly_offers-sort_order');
    });

exports.down = knex =>
    knex.schema.table('subscription_weekly_offers', table => {
        table.dropColumn('sort_order');
        table.dropIndex('sort_order', 'idx-menu_items-sort_order');
    });
