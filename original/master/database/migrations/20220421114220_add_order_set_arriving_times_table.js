exports.up = function (knex) {
    return knex.schema.createTable('order_set_arriving_times', table => {
        table.uuid('id').primary()
            .notNullable();
        table.uuid('order_set_id')
            .references('id')
            .inTable('order_sets')
            .index()
            .notNullable();
        table
            .uuid('branch_id')
            .notNullable();
        table
            .uuid('country_id')
            .notNullable();
        table.string('fulfillment_type').notNullable();
        table.timestamp('order_set_creation_time');
        table.integer('selected_option');
        table.timestamp('arrival_time');
        table.boolean('arrived');
        table
            .timestamp('created_at')
            .notNullable()
            .defaultTo(knex.fn.now());
    });
};

exports.down = async function (knex) {
    await knex.schema.dropTable('order_set_arriving_times');
};