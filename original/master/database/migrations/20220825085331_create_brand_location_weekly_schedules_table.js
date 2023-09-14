const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = function (knex) {
    return knex.schema.createTable('brand_location_weekly_schedules', table => {  
        table.uuid('id').primary();
        table
            .uuid('brand_location_id')
            .references('id')
            .inTable('brand_locations')
            .index()
            .notNullable();
        table
            .integer('day')
            .notNullable();
        table
            .boolean('pickup_open_all_day')
            .default(false)
            .notNullable();
        table.jsonb('pickup_schedule_info');
        table
            .boolean('car_open_all_day')
            .default(false)
            .notNullable();
        table.jsonb('car_schedule_info');
        table
            .boolean('delivery_open_all_day')
            .default(false)
            .notNullable();
        table.jsonb('delivery_schedule_info');
        table
            .boolean('express_delivery_open_all_day')
            .default(false)
            .notNullable();
        table.jsonb('express_delivery_schedule_info');   
        table
            .timestamp('created')
            .notNullable()
            .defaultTo(knex.fn.now());
        table
            .timestamp('updated')
            .notNullable()
            .defaultTo(knex.fn.now());
        table.unique(['brand_location_id', 'day']);    
    }).then(() => knex.raw(onUpdateTrigger('brand_location_weekly_schedules')));
};
  
exports.down = async function (knex) {
    await knex.schema.dropTable('brand_location_weekly_schedules');
};