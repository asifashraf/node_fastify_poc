const { statusTypes } = require('./../../src/schema/root/enums');

exports.up = knex =>
  knex.schema.alterTable('coupons', table => {
    table.string('status');
  });

exports.down = knex =>
  knex.schema.table('coupons', table => {
    table.dropColumn('status');
  });
