exports.up = function (knex) {
    return knex.schema.alterTable('subscription_customers', table => {
        table
            .uuid('country_id')
            .references('id')
            .inTable('countries')
            .index();
    });
};

exports.down = async function (knex) {
    await knex.schema.alterTable('subscription_customers', table => {
        table.dropColumn('currency_id');
    });
};
