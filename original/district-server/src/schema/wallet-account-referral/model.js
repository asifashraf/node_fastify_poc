const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');
const { transformToCamelCase } = require('../../lib/util');
const moment = require('moment');
const { first } = require('lodash');

const todayUnix = () =>
  moment(`${moment().format('YYYY-MM-DD')}T00:00:00Z`).unix();

class WalletAccountReferral extends BaseModel {
  constructor(db, context) {
    super(db, 'wallet_account_referrals', context);
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
        'wallet_account_referrals.*',
        this.db.raw(
          '(wallet_account_referrals.amount  - wallet_account_referrals.consumed) as remaining_referral'
        )
      )
      .where('wallet_account_id', id)
      .whereRaw(
        'wallet_account_referrals.amount > wallet_account_referrals.consumed'
      )
      .where('expired', false)
      .orderBy('expires_on', 'ASC')
      .then(transformToCamelCase);
  }

  getNearestRemainedByWalletAccountId(id) {
    return this.roDb(this.tableName)
      .where('wallet_account_id', id)
      .where('expired', false)
      .whereRaw(
        'wallet_account_referrals.amount > wallet_account_referrals.consumed'
      )
      .orderBy('expires_on', 'ASC')
      .then(first);
  }

  getReferralToExpire() {
    return this.roDb
      .select(
        'wallet_account_referrals.*',
        'wallet_accounts.customer_id',
        'wallet_accounts.currency_id',
        this.roDb.raw(
          '(wallet_account_referrals.amount  - wallet_account_referrals.consumed) as remaining_referral'
        )
      )
      .from('wallet_account_referrals')
      .joinRaw(
        ' inner join wallet_accounts on wallet_accounts.id = wallet_account_referrals.wallet_account_id'
      )
      .whereRaw(
        `( expires_on != 0 and expires_on is not null and expires_on < ${todayUnix()} and amount > 0)`
      )
      .whereRaw(
        'wallet_account_referrals.amount > wallet_account_referrals.consumed'
      )
      .where('expired', false)
      .orderBy('expires_on', 'ASC');
  }

  getReferralToExpireForCustomer(customerId) {
    return this.roDb
      .select(
        'wallet_account_referrals.*',
        'wallet_accounts.customer_id',
        'wallet_accounts.currency_id',
        this.roDb.raw(
          '(wallet_account_referrals.amount  - wallet_account_referrals.consumed) as remaining_referral'
        )
      )
      .from('wallet_account_referrals')
      .joinRaw(
        ' inner join wallet_accounts on wallet_accounts.id = wallet_account_referrals.wallet_account_id'
      )
      .whereRaw(
        `( expires_on != 0 and expires_on is not null and expires_on < ${todayUnix()} and amount > 0)`
      )
      .whereRaw(
        'wallet_account_referrals.amount > wallet_account_referrals.consumed'
      )
      .where('customer_id', customerId)
      .where('expired', false)
      .orderBy('expires_on', 'ASC');
  }
}

module.exports = WalletAccountReferral;
