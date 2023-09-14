exports.up = async knex => {
  await knex.schema.table('wallet_account_referrals', table => {
    table.index('expires_on', 'idx-wallet_account_referrals-expires_on');
    table.index('amount', 'idx-wallet_account_referrals-amount');
    table.index('expired', 'idx-wallet_account_referrals-expired');
    table.index(
      'sender_wallet_account_id',
      'idx-wallet_account_referrals-sender_wallet_account_id'
    );
  });
};

exports.down = async knex => {
  await knex.schema.table('wallet_account_referrals', table => {
    table.dropIndex('expires_on', 'idx-wallet_account_referrals-expires_on');
    table.dropIndex('amount', 'idx-wallet_account_referrals-amount');
    table.dropIndex('expired', 'idx-wallet_account_referrals-expired');
    table.dropIndex(
      'sender_wallet_account_id',
      'idx-wallet_account_referrals-sender_wallet_account_id'
    );
  });
};
