exports.up = knex =>
    knex.schema.table('subscriptions', table => {
        table.string('short_description');
        table.string('short_description_ar');
        table.string('short_description_tr');
    });

exports.down = knex =>
    knex.schema.table('subscriptions', table => {
        table.dropColumn('short_description');
        table.dropColumn('short_description_ar');
        table.dropColumn('short_description_tr');
    });
