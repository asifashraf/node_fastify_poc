exports.up = knex =>
  knex.schema.alterTable('wallet_accounts', table => {
    table.specificType('cashback_amount', 'numeric(13,3)').default(0);
    table.integer('cashback_amount_expires_on').default(0);
  });

exports.down = knex =>
  knex.schema.alterTable('wallet_accounts', table => {
    table.dropColumn('cashback_amount');
    table.dropColumn('cashback_amount_expires_on');
  });
