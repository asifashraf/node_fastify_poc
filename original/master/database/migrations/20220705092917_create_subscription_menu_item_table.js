exports.up = function (knex) {
    return knex.schema.createTable('subscription_menu_items', table => {
        table.uuid('id')
            .primary()
            .notNullable();
        table.uuid('subscription_id')
            .references('id')
            .inTable('subscriptions')
            .index()
            .notNullable();
        table.uuid('brand_id')
            .references('id')
            .inTable('brands')
            .index()
            .notNullable();
        table.uuid('menu_item_id')
            .references('id')
            .inTable('menu_items')
            .index()
            .notNullable();
        table.timestamp('created')
            .notNullable()
            .defaultTo(knex.fn.now());
        table.timestamp('updated')
            .notNullable()
            .defaultTo(knex.fn.now());
    });
};

exports.down = async function (knex) {
    await knex.schema.dropTable('subscription_menu_items');
};
