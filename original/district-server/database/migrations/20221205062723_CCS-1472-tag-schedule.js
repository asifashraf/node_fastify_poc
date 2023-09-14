const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = function (knex) {
  return knex.schema.createTable('tag_schedules', table => {
    table.uuid('id').primary().notNullable();
    table.uuid('tag_id')
      .references('id')
      .inTable('tags')
      .index()
      .notNullable();
    table.enu('status', ['ACTIVE', 'DELETED'], {    
      useNative: true,
      enumName: 'tag_schedules_status_enum',
    });  
    table.datetime('start_time');
    table.datetime('end_time');
    table
      .datetime('created')
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .timestamp('updated')
      .notNullable()
      .defaultTo(knex.fn.now());
  }).then(() => knex.raw(onUpdateTrigger('tag_schedules')));;;
};
  
exports.down = async function (knex) {
  return knex.schema.dropTable('tag_schedules');
};
