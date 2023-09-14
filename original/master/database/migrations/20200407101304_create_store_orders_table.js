const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .createTable('store_orders', table => {
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
        .uuid('store_order_set_id')
        .references('id')
        .inTable('store_order_sets');
      table
        .uuid('brand_id')
        .references('id')
        .inTable('brands');
      table.boolean('acknowledged').default(false);
      table.string('short_code', 15).index();
      table.specificType('total', 'numeric(13,3)').default(0);
    })
    .then(() => knex.raw(onUpdateTrigger('store_orders')));

exports.down = knex => knex.schema.dropTable('store_orders');
