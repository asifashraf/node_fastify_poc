const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .createTable('used_coupon_details', table => {
      table.uuid('id').primary();
      table
        .timestamp('created')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp('updated')
        .notNullable()
        .defaultTo(knex.fn.now());
      table.string('used_on').index();
      table.uuid('reference_id').index();
      table
        .uuid('coupon_id')
        .references('coupons.id')
        .index();
      table.string('type').index();
      table.specificType('amount', 'numeric(13, 3)').default(0);
    })
    .then(() => knex.raw(onUpdateTrigger('used_coupon_details')));

exports.down = knex => knex.schema.dropTable('used_coupon_details');
