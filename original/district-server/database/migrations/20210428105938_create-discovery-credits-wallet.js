exports.up = knex =>
  knex.schema.alterTable('wallet_accounts', table => {
    table.specificType('discovery_amount', 'numeric(13,3)').default(0);
    table.integer('discovery_amount_expires_on').default(0);
  });

exports.down = knex =>
  knex.schema.alterTable('wallet_accounts', table => {
    table.dropColumn('discovery_amount');
    table.dropColumn('discovery_amount_expires_on');
  });
