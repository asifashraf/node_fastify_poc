exports.up = function (knex) {
    return knex.schema.createTable('maintenance_request', table => {
        table.uuid('id').primary();
        table
            .uuid('brand_id')
            .references('id')
            .inTable('brands')
            .index()
            .notNullable();
        table
            .uuid('brand_location_id')
            .references('id')
            .inTable('brand_locations')
            .index();
        table
            .string('status')
            .default('REQUESTED')
            .notNullable();    
        table
            .timestamp('created')
            .notNullable()
            .defaultTo(knex.fn.now());
    });
};

exports.down = async function (knex) {
    await knex.schema.dropTable('maintenance_request');
};