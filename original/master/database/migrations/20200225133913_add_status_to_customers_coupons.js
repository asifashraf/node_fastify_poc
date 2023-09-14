exports.up = knex =>
  knex.schema.alterTable('customers_coupons', table => {
    table.string('status').defaultTo('ACTIVE');
  });

exports.down = knex =>
  knex.schema.table('customers_coupons', table => {
    table.dropColumn('status');
  });
