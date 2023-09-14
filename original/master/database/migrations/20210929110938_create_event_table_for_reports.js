
const { eventTypeForReport } = require('../../src/schema/root/enums');

exports.up = function(knex) {
    return knex.schema.createTable('events', table => {
        table.uuid('id').primary();
        table
            .uuid('country_id')
            .references('id')
            .inTable('countries')
            .index()
            .notNullable();
        table
            .uuid('brand_location_id')
            .references('id')
            .inTable('brand_locations')
            .index();    
        table.enu('event_type', Object.values(eventTypeForReport), {
            useNative: true,
            enumName: 'event_type_enum',
            })
            .notNullable();
        table.jsonb('event_data').notNullable();  
        table
            .timestamp('created_at')
            .notNullable()
            .defaultTo(knex.fn.now());
    });
};
  
exports.down = async function(knex) {
    await knex.schema.dropTable('events');
    return knex.schema.raw('DROP TYPE event_type_enum;');
};