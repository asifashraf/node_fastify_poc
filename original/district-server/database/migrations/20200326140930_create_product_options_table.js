const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .createTable('product_options', table => {
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
        .uuid('product_option_set_id')
        .references('id')
        .inTable('product_option_sets');
      table.string('name');
      table.string('name_ar');
      table.integer('sort_order').default(0);
      table.specificType('list_price', 'numeric(13,3)').default(0);
      table.specificType('on_sale_price', 'numeric(13,3)').default(0);
    })
    .then(() => knex.raw(onUpdateTrigger('product_options')));

exports.down = knex => knex.schema.dropTable('product_options');
