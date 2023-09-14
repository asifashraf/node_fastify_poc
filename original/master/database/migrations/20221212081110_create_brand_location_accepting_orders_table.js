const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = function (knex) {
    return knex.schema.createTable('brand_location_accepting_orders', table => {  
        table.uuid('id').primary();
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
            .boolean('pickup')
            .default(false)
            .notNullable();       
        table.datetime('pickup_end_time');
        table
            .boolean('car')
            .default(false)
            .notNullable();       
        table.datetime('car_end_time');        
        table
            .boolean('delivery')
            .default(false)
            .notNullable();
        table.datetime('delivery_end_time');
        table
            .boolean('express_delivery')
            .default(false)
            .notNullable();
        table.datetime('express_delivery_end_time');    
        table
            .timestamp('created')
            .notNullable()
            .defaultTo(knex.fn.now());
        table
            .timestamp('updated')
            .notNullable()
            .defaultTo(knex.fn.now());   
    }).then(() => knex.raw(onUpdateTrigger('brand_location_accepting_orders')));
};
  
exports.down = async function (knex) {
    await knex.schema.dropTable('brand_location_accepting_orders');
};