const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .createTable('brand_admins', table => {
      table.uuid('id').primary();
      table
        .uuid('admin_id')
        .references('id')
        .inTable('admins')
        .index();
      table
        .uuid('brand_id')
        .references('id')
        .inTable('brands')
        .index();
      table
        .uuid('brand_location_id')
        .references('id')
        .inTable('brand_locations')
        .index();
      table.string('status', 32).defaultTo(null);
      table.string('role', 32).defaultTo(null);
      table
        .timestamp('created')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp('updated')
        .notNullable()
        .defaultTo(knex.fn.now());
    })
    .then(() => knex.raw(onUpdateTrigger('brand_admins')));

exports.down = knex => knex.schema.dropTable('brand_admins');
