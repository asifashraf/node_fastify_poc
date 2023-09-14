exports.up = knex =>
  knex.schema.table('customers_coupons', table => {
    table.dropColumn('status');
  });

exports.down = knex =>
  knex.schema.alterTable('customers_coupons', table => {
    table.string('status').defaultTo('ACTIVE');
  });
