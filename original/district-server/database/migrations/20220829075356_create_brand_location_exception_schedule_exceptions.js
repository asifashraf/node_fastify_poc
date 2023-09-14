const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = function (knex) {
    return knex.schema.createTable('brand_location_schedule_exceptions', table => {  
        table.uuid('id').primary();
        table.string('name');
        table
            .uuid('brand_location_id')
            .references('id')
            .inTable('brand_locations')
            .index()
            .notNullable();
        table
            .boolean('status')
            .default(true)
            .notNullable();   
        table
            .boolean('is_closed')
            .default(true)
            .notNullable(); 
        table
            .datetime('start_time')
            .notNullable();
        table
            .datetime('end_time')
            .notNullable();       
        table
            .boolean('pickup')
            .default(false)
            .notNullable();
        table
            .boolean('car')
            .default(false)
            .notNullable();
        table
            .boolean('delivery')
            .default(false)
            .notNullable();
        table
            .boolean('express_delivery')
            .default(false)
            .notNullable();
        table
            .timestamp('created')
            .notNullable()
            .defaultTo(knex.fn.now());
        table
            .timestamp('updated')
            .notNullable()
            .defaultTo(knex.fn.now());   
    }).then(() => knex.raw(onUpdateTrigger('brand_location_schedule_exceptions')));
};
  
exports.down = async function (knex) {
    await knex.schema.dropTable('brand_location_schedule_exceptions');
};