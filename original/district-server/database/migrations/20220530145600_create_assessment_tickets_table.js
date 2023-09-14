const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = function (knex) {
  return knex.schema.createTable('maintenance_assessment_tickets', table => {
    table.uuid('id').primary();
    table
      .uuid('assessment_id')
      .references('id')
      .inTable('maintenance_assessments')
      .index()
      .notNullable();
    table.string('subject').notNullable(); 
    table.string('description').notNullable();
    table.string('flat_office');
    table.string('phone_number');
    table.string('status').notNullable();
    table.integer('ticket_id');
    table
      .timestamp('created')
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .timestamp('updated')
      .notNullable()
      .defaultTo(knex.fn.now());
  }).then(() => knex.raw(onUpdateTrigger('maintenance_assessment_tickets')));
};

exports.down = async function (knex) {
  await knex.schema.dropTable('maintenance_assessment_tickets');
};