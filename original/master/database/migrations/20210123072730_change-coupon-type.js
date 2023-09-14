const { promoType } = require('./../../src/schema/root/enums');

exports.up = knex =>
  knex.schema.alterTable('order_sets', table => {
    table
      .boolean('is_cashback_coupon')
      .defaultTo(false)
      .alter();
  });

exports.down = knex =>
  knex.schema.alterTable('order_sets', table => {
    table
      .string('is_cashback_coupon')
      .defaultTo(false)
      .alter();
  });
