const DataLoader = require('dataloader');
const { map, find } = require('lodash');

function createLoaders(model) {
  return {
    currency: new DataLoader(async walletAccountIds => {
      const currencies = await model
        .db('currencies')
        .join('wallet_accounts', 'wallet_accounts.currency_id', 'currencies.id')
        .select('currencies.*', 'wallet_accounts.id as wallet_account_id')
        .whereIn('wallet_accounts.id', walletAccountIds);
      return map(walletAccountIds, walletAccountId =>
        find(
          currencies,
          currency => currency.walletAccountId === walletAccountId
        )
      );
    }),
  };
}

module.exports = { createLoaders };
