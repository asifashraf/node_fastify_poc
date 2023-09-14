exports.up = function (knex) {
    return knex.schema.alterTable('common_content_category', table => {
        table.unique(['slug', 'country_id']);
        table.dropUnique('slug');
    });
};

exports.down = function (knex) {
    return knex.schema.alterTable('common_content_category', table => {
        table.dropUnique(['slug', 'country_id']);
    });
};
