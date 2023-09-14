exports.up = knex =>
  knex.schema.alterTable('wallet_account_referrals', table => {
    table
      .specificType('consumed', 'numeric(13,3)')
      .index()
      .default(0);
  });

exports.down = knex =>
  knex.schema.table('wallet_account_referrals', table => {
    table.dropColumn('consumed');
  });
