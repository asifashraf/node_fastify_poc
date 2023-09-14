exports.up = knex =>
    knex.schema.table('subscriptions', table => {
        table.string('icon_url');
        table.string('icon_url_ar');
        table.string('icon_url_tr');
    });

exports.down = knex =>
    knex.schema.table('subscriptions', table => {
        table.dropColumn('icon_url');
        table.dropColumn('icon_url_ar');
        table.dropColumn('icon_url_tr');
    });
