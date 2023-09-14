exports.up = knex =>
    knex.schema.table('order_fulfillment', table => {
        table
            .uuid('vehicle_id')
            .references('id')
            .inTable('customer_cars')
            .nullable();
    });

exports.down = knex =>
    knex.schema.table('order_fulfillment', table => {
        table.dropColumn('vehicle_id');
    });
