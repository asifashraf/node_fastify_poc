exports.up = async knex => {
  await knex.schema.table('wallet_accounts', table => {
    table.index('customer_id', 'idx-wallet_accounts-customer_id');
    table.index('currency_id', 'idx-wallet_accounts-currency_id');
  });
};

exports.down = async knex => {
  await knex.schema.table('wallet_accounts', table => {
    table.dropIndex('customer_id', 'idx-wallet_accounts-customer_id');
    table.dropIndex('currency_id', 'idx-wallet_accounts-currency_id');
  });
};
