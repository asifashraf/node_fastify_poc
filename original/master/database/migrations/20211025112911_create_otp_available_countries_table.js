const { onUpdateTrigger } = require('../../knexfile.js');
const tableName = 'otp_available_countries';

exports.up = function(knex) {
  return knex.schema.createTable(tableName, table => {
    table.uuid('id').primary();
    table.string('name', 200).notNullable();
    table.string('name_ar', 200);
    table.string('name_en', 200);
    table.string('name_tr', 200);
    table.string('iso_code', 32).notNullable();
    table.string('dial_code', 32).notNullable();
    table.string('flag_photo').notNullable();
    table
      .timestamp('created')
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .timestamp('updated')
      .notNullable()
      .defaultTo(knex.fn.now());
  }).then(() => knex.raw(onUpdateTrigger(tableName)));
};

exports.down = async function(knex) {
  await knex.schema.dropTable(tableName);
};
