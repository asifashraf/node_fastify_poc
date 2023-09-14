exports.up = function (knex) {
    return knex.schema.alterTable('common_content_category', table => {
        table.uuid('country_id')
            .references('id')
            .inTable('countries')
            .index();
    });
};

exports.down = function (knex) {
    return knex.schema.alterTable('common_content_category', tableBuilder => {
        tableBuilder.dropColumn('country_id');
    });
};
