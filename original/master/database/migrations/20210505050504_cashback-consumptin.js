exports.up = knex =>
  knex.schema.alterTable('wallet_account_cashbacks', table => {
    table
      .specificType('consumed', 'numeric(13,3)')
      .index()
      .default(0);
  });

exports.down = knex =>
  knex.schema.table('wallet_account_cashbacks', table => {
    table.dropColumn('consumed');
  });
