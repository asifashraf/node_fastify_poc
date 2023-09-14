exports.up = function (knex) {
    return knex.schema.alterTable('subscriptions', table => {
        table.string('name_ar');
        table.string('name_tr');
        table.string('description_ar');
        table.string('description_tr');
        table.string('image_url_ar');
        table.string('image_url_tr');
    });
};

exports.down = async function (knex) {
    await knex.schema.alterTable('subscriptions', table => {
        table.dropColumn('name_ar');
        table.dropColumn('name_tr');
        table.dropColumn('description_ar');
        table.dropColumn('description_tr');
        table.dropColumn('image_url_ar');
        table.dropColumn('image_url_tr');
    });
};
