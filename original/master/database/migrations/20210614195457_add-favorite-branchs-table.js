exports.up = knex =>
    knex.schema.createTable('customer_favorite_brand_locations', table => {
        table.uuid('id').primary();
        table
            .timestamp('created')
            .notNullable()
            .defaultTo(knex.fn.now());
        table
            .string('customer_id')
            .references('id')
            .inTable('customers')
            .index();
        table
            .uuid('brand_location_id')
            .references('id')
            .inTable('brand_locations')
            .index();
    });

exports.down = knex =>
    knex.schema.dropTable('customer_favorite_brand_locations');