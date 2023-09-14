const { promoType } = require('./../../src/schema/root/enums');

exports.up = knex =>
  knex.schema.alterTable('coupons', table => {
    table.string('type').defaultTo(promoType.REGULAR);
    table.integer('cashback_expire_in_days');
  });

exports.down = knex =>
  knex.schema.alterTable('coupons', table => {
    table.dropColumn('type');
    table.dropColumn('cashback_expire_in_days');
  });
