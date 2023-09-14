const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .createTable('products', table => {
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
        .uuid('brand_id')
        .references('id')
        .inTable('brands');
      table
        .string('status', 32)
        .index()
        .notNullable()
        .defaultTo('ACTIVE');
      table.string('name');
      table.string('name_ar');
      table.text('description');
      table.text('description_ar');
      table.integer('sort_order').default(0);
      table.specificType('list_price', 'numeric(13,3)').default(0);
      table.specificType('on_sale_price', 'numeric(13,3)').default(0);
      table.integer('warranty').default(0);
      table.string('return_policy');
      table.string('return_policy_ar');
      table.boolean('express').default(false);
    })
    .then(() => knex.raw(onUpdateTrigger('products')));

exports.down = knex => knex.schema.dropTable('products');
