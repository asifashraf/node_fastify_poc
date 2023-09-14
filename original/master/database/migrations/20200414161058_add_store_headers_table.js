const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .createTable('store_headers', table => {
      table.uuid('id').primary();
      table
        .timestamp('created')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp('updated')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .uuid('country_id')
        .references('id')
        .inTable('countries');
      table.string('image');
      table.string('image_ar');
      table.timestamp('available_from');
      table.timestamp('available_until');
      table.string('action');
      table
        .string('status', 32)
        .index()
        .notNullable()
        .defaultTo('ACTIVE');
      table.integer('sort_order').default(0);
    })
    .then(() => knex.raw(onUpdateTrigger('store_headers')));

exports.down = knex => knex.schema.dropTable('store_headers');
