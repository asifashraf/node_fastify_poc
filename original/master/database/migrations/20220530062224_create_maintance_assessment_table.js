const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = function (knex) {
  return knex.schema.createTable('maintenance_assessments', table => {
    table.uuid('id').primary();
    table
      .uuid('maintenance_id')
      .references('id')
      .inTable('brand_location_maintenances')
      .index()
      .notNullable();
    table.jsonb('area').notNullable();
    table.jsonb('sub_service').notNullable();
    table.string('block').notNullable(); 
    table.string('street').notNullable();
    table.string('avenue');
    table.string('building_number').notNullable();
    table.string('phone_number').notNullable();
    table.string('status').notNullable();
    table.integer('assessment_id');
    table.string('assessment_code');
    table
      .timestamp('created')
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .timestamp('updated')
      .notNullable()
      .defaultTo(knex.fn.now());
  }).then(() => knex.raw(onUpdateTrigger('maintenance_assessments')));
};

exports.down = async function (knex) {
  await knex.schema.dropTable('maintenance_assessments');
};