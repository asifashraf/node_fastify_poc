const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .createTable('product_images', table => {
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
        .uuid('product_id')
        .references('id')
        .inTable('products');
      table.string('url');
      table.boolean('main_image').default(false);
      table.integer('sort_order').default(0);
    })
    .then(() => knex.raw(onUpdateTrigger('product_images')));

exports.down = knex => knex.schema.dropTable('product_images');
