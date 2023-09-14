exports.up = async knex => {
  await knex.schema.table('wallet_account_cashbacks', table => {
    table.index('expires_on', 'idx-wallet_account_cashbacks-expires_on');
    table.index('amount', 'idx-wallet_account_cashbacks-amount');
    table.index('expired', 'idx-wallet_account_cashbacks-expired');
    table.index(
      'wallet_account_id',
      'idx-wallet_account_cashbacks-wallet_account_id'
    );
  });
};

exports.down = async knex => {
  await knex.schema.table('wallet_account_cashbacks', table => {
    table.dropIndex('expires_on', 'idx-wallet_account_cashbacks-expires_on');
    table.dropIndex('amount', 'idx-wallet_account_cashbacks-amount');
    table.dropIndex('expired', 'idx-wallet_account_cashbacks-expired');
    table.dropIndex(
      'wallet_account_id',
      'idx-wallet_account_cashbacks-wallet_account_id'
    );
  });
};
