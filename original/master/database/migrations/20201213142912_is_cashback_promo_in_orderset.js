const { promoType } = require('./../../src/schema/root/enums');

exports.up = knex =>
  knex.schema.alterTable('order_sets', table => {
    table.string('is_cashback_coupon').defaultTo(false);
  });

exports.down = knex =>
  knex.schema.alterTable('order_sets', table => {
    table.dropColumn('is_cashback_coupon');
  });
