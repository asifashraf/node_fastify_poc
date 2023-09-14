const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .createTable('store_order_products', table => {
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
        .uuid('store_order_id')
        .references('id')
        .inTable('store_orders');
      table
        .uuid('product_id')
        .references('id')
        .inTable('products');
      table.integer('quantity').default(0);
      table.string('name');
      table.string('name_ar');
      table.specificType('price', 'numeric(13,3)').default(0);
      table.specificType('compare_at_price', 'numeric(13,3)').default(0);
      table.specificType('cost_per_item', 'numeric(13,3)').default(0);
      table.string('image');
    })
    .then(() => knex.raw(onUpdateTrigger('store_order_products')));

exports.down = knex => knex.schema.dropTable('store_order_products');
