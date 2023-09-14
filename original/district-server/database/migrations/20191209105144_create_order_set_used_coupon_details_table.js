const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .createTable('order_set_used_coupon_details', table => {
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
        .uuid('order_set_id')
        .references('id')
        .inTable('order_sets')
        .index();
      table
        .uuid('coupon_id')
        .references('id')
        .inTable('coupons')
        .index();
      table.string('type').index();
      table.specificType('amount', 'numeric(13, 3)').default(0);
    })
    .then(() => knex.raw(onUpdateTrigger('order_set_used_coupon_details')));

exports.down = knex => knex.schema.dropTable('order_set_used_coupon_details');
