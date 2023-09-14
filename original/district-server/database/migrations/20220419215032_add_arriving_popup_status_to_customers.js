exports.up = knex =>
    knex.schema.table('customers', table => {
        table
            .boolean('arriving_popup_status')
            .notNullable()
            .defaultTo(false);
    });

exports.down = knex =>
    knex.schema.table('customers', table => {
        table.dropColumn('arriving_popup_status');
    });
