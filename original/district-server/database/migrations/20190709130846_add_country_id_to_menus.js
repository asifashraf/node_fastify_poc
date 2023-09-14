const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .table('menus', table => {
      table
        .uuid('country_id')
        .references('id')
        .inTable('countries')
        .index();
      table
        .timestamp('created')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp('updated')
        .notNullable()
        .defaultTo(knex.fn.now());
    })
    .then(() => knex.raw(onUpdateTrigger('menus')));

exports.down = knex =>
  knex.schema.table('menus', table => {
    table.dropColumn('country_id');
    table.dropColumn('created');
    table.dropColumn('updated');
  });
