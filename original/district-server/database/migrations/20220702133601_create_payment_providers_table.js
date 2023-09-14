const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = function (knex) {
    return knex.schema.createTable('payment_providers', table => {
      table
        .uuid('id')
        .primary()
        .notNullable();
      table
        .string('provider_name')
        .notNullable();
      table
        .uuid('country_id')
        .references('id')
        .inTable('countries')
        .index()
        .notNullable()
        .onDelete('CASCADE'); 
      table
        .string('status')
        .defaultTo('ACTIVE')
        .notNullable();
      table
        .timestamp('created')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp('updated')
        .notNullable()
        .defaultTo(knex.fn.now());
      table.unique(['provider_name', 'country_id']);   
    }).then(() => knex.raw(onUpdateTrigger('payment_providers')));
  };
  
  exports.down = async function (knex) {
    await knex.schema.dropTable('payment_providers');
  };
  