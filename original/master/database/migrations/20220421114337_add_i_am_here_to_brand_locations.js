exports.up = knex =>
    knex.schema.table('brand_locations', table => {
        table
            .boolean('i_am_here')
            .notNullable()
            .defaultTo(false);
    });

exports.down = knex =>
    knex.schema.table('brand_locations', table => {
        table.dropColumn('i_am_here');
    });
