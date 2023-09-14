exports.up = function (knex) {
    return knex.schema.createTable('suggest_brands', table => {
        table.uuid('id').primary()
            .notNullable();
        table.string('shop_name').notNullable();
        table.string('location').notNullable();
        table.boolean('is_owner').notNullable();
        table.string('customer_id');
        table
            .timestamp('created_at')
            .notNullable()
            .defaultTo(knex.fn.now());
    });
};

exports.down = async function (knex) {
    await knex.schema.dropTable('suggest_brands');
};