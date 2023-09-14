const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .createTable('coupon_details', table => {
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
        .uuid('coupon_id')
        .references('id')
        .inTable('coupons')
        .index();
      table.string('type').index();
      table.specificType('amount', 'numeric(13, 3)').default(0);
    })
    .then(() => knex.raw(onUpdateTrigger('coupon_details')));

exports.down = knex => knex.schema.dropTable('coupon_details');
