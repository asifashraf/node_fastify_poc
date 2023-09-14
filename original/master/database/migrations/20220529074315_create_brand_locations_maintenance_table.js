const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = function (knex) {
  return knex.schema.createTable('brand_location_maintenances', table => {
    table.uuid('id').primary();
    table
      .uuid('brand_location_id')
      .references('id')
      .inTable('brand_locations')
      .index()
      .notNullable();
    table.string('name').notNullable(); 
    table.string('email').notNullable().unique();
    table.string('phone_number');
    table.jsonb('address_info');
    table.bigIncrements('external_user_id', { primaryKey: false }).notNullable();
    table.integer('user_id');
    table.integer('company_id');
    table.string('status').notNullable();
    table
      .timestamp('created')
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .timestamp('updated')
      .notNullable()
      .defaultTo(knex.fn.now());
  }).then(() => knex.raw(onUpdateTrigger('brand_location_maintenances')));
};

exports.down = async function (knex) {
  await knex.schema.dropTable('brand_location_maintenances');
};