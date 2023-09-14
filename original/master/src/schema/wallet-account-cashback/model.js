const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');
const { transformToCamelCase } = require('../../lib/util');
const moment = require('moment');
const todayUnix = () =>
  moment(`${moment().format('YYYY-MM-DD')}T00:00:00Z`).unix();
const { first } = require('lodash');

class WalletAccountCashback extends BaseModel {
  constructor(db, context) {
    super(db, 'wallet_account_cashbacks', context);
    this.loaders = createLoaders(this);
  }

  getByWalletAccountId(id) {
    return this.db(this.tableName)
      .where('wallet_account_id', id)
      .orderBy('expires_on', 'ASC')
      .then(transformToCamelCase);
  }

  getRemainedByWalletAccountId(id) {
    return this.db(this.tableName)
      .select(
        'wallet_account_cashbacks.*',
        this.db.raw(
          '(wallet_account_cashbacks.amount  - wallet_account_cashbacks.consumed) as remaining_cashback'
        )
      )
      .where('wallet_account_id', id)
      .whereRaw(
        'wallet_account_cashbacks.amount > wallet_account_cashbacks.consumed'
      )
      .where('deprecated', false)
      .where('expired', false)
      .orderBy('expires_on', 'ASC')
      .then(transformToCamelCase);
  }

  getNearestRemainedByWalletAccountId(id) {
    return this.roDb(this.tableName)
      .where('wallet_account_id', id)
      .where('deprecated', false)
      .where('expired', false)
      .whereRaw(
        'wallet_account_cashbacks.amount > wallet_account_cashbacks.consumed'
      )
      .orderBy('expires_on', 'ASC')
      .then(first);
  }

  getCashbackToExpire() {
    return this.roDb
      .select(
        'wallet_account_cashbacks.*',
        'wallet_accounts.customer_id',
        'wallet_accounts.currency_id',
        this.roDb.raw(
          '(wallet_account_cashbacks.amount  - wallet_account_cashbacks.consumed) as remaining_cashback'
        )
      )
      .from('wallet_account_cashbacks')
      .joinRaw(
        ' inner join wallet_accounts on wallet_accounts.id = wallet_account_cashbacks.wallet_account_id'
      )
      .whereRaw(
        `( expires_on != 0 and expires_on is not null and expires_on < ${todayUnix()} and amount > 0)`
      )
      .whereRaw(
        'wallet_account_cashbacks.amount > wallet_account_cashbacks.consumed'
      )
      .where('deprecated', false)
      .where('expired', false)
      .orderBy('expires_on', 'ASC');
  }

  getCashbackToExpireForCustomer(customerId) {
    return this.roDb
      .select(
        'wallet_account_cashbacks.*',
        'wallet_accounts.customer_id',
        'wallet_accounts.currency_id',
        this.roDb.raw(
          '(wallet_account_cashbacks.amount  - wallet_account_cashbacks.consumed) as remaining_cashback'
        )
      )
      .from('wallet_account_cashbacks')
      .joinRaw(
        ' inner join wallet_accounts on wallet_accounts.id = wallet_account_cashbacks.wallet_account_id'
      )
      .whereRaw(
        `( expires_on != 0 and expires_on is not null and expires_on < ${todayUnix()} and amount > 0)`
      )
      .whereRaw(
        'wallet_account_cashbacks.amount > wallet_account_cashbacks.consumed'
      )
      .where('customer_id', customerId)
      .where('deprecated', false)
      .where('expired', false)
      .orderBy('expires_on', 'ASC');
  }
}

module.exports = WalletAccountCashback;
