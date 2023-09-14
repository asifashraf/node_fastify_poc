const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex => knex.schema.dropTable('product_option_sets');

exports.down = knex =>
  knex.schema
    .createTable('product_option_sets', table => {
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
      table.string('label');
      table.string('label_ar');
      table.boolean('single').default(true);
      table.integer('sort_order').default(0);
    })
    .then(() => knex.raw(onUpdateTrigger('product_option_sets')));
