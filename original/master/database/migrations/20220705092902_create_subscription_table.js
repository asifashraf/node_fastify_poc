exports.up = function (knex) {
    return knex.schema.createTable('subscriptions', table => {
        table.uuid('id')
            .primary()
            .notNullable();
        table.string('name')
            .notNullable();
        table.string('description');
        table.string('image_url');
        table.specificType('compare_at_price', 'numeric(13,3)');
        table.specificType('price', 'numeric(13,3)')
            .notNullable();
        table.integer('total_cups_count');
        table.integer('per_day_cups_count');
        table.integer('per_order_max_cups_count');
        table.bigInteger('period');
        table.uuid('currency_id')
            .references('id')
            .inTable('currencies')
            .index()
            .notNullable();
        table.uuid('country_id')
            .references('id')
            .inTable('countries')
            .index()
            .notNullable();
        table.enu('status', ['ACTIVE', 'INACTIVE'], {
            useNative: true,
            enumName: 'subscription_status_enum',
        });
        table.timestamp('created')
            .notNullable()
            .defaultTo(knex.fn.now());
        table.timestamp('updated')
            .notNullable()
            .defaultTo(knex.fn.now());
    });
};

exports.down = async function (knex) {
    await knex.schema.dropTable('subscriptions');
};
