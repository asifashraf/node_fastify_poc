exports.up = knex =>
  knex.schema.table('coupons', table => {
    table.string('valid_email_domains');
  });

exports.down = knex =>
  knex.schema.table('coupons', table => {
    table.dropColumn('valid_email_domains');
  });
