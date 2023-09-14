exports.up = knex =>
  knex.schema.alterTable('customers', table => {
    table.string('referral_code', 10).index();
  });

exports.down = knex =>
  knex.schema.table('customers', table => {
    table.dropColumn('referral_code');
  });
