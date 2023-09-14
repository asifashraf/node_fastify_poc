/* eslint-disable complexity */
const BaseModel = require('../../base-model');
const { get, filter, uniq, find, map } = require('lodash');
const { addPaging, addLocalizationField, uuid } = require('../../lib/util');

const {
  updateCofeCreditsError,
  loyaltyTransactionType,
  updateCofeCreditsTransactionType,
  addCreditsForCustomersPayloadError,
  transactionType,
} = require('../root/enums');
const { csvToJSON } = require('../../lib/aws-s3');

class LoyaltyTransaction extends BaseModel {
  constructor(db, context) {
    super(db, 'loyalty_transactions', context);
  }

  getByCustomer(customerId, paging) {
    const query = this.db(this.tableName)
      .where('customer_id', customerId)
      .orderBy('created_at', 'desc');

    return addPaging(query, paging);
  }

  async getByOrderId(id) {
    const loyaltyTransaction = await this.db(this.tableName).where(
      'reference_order_id',
      id
    );
    return loyaltyTransaction;
  }

  async getBalanceByCustomer(customerId, currencyId) {
    if (!currencyId) {
      const currency = await this.context.currency.getByCode();
      currencyId = currency.id;
    }
    const query = `SELECT coalesce((sum(credit) - sum(debit)),0) as balance FROM loyalty_transactions WHERE customer_id = :customerId and currency_id = :currencyId and order_type <> '${loyaltyTransactionType.DISCOVERY_CREDITS}' and order_type <> '${loyaltyTransactionType.DISCOVERY_CREDITS_EXPIRY}'  and order_type <> '${loyaltyTransactionType.DISCOVERY_CREDITS_REFUND}'`;

    const results = await this.db
      .raw(query, { customerId, currencyId })
      .then(result => result.rows);
    const balance = Number(get(results, '[0].balance', 0));
    return balance < 0 ? 0 : balance;
  }

  async debitedForOrderId(id) {
    const query = `
    SELECT sum(debit) as balance
    FROM loyalty_transactions
    WHERE reference_order_id = :id  and order_type <> '${loyaltyTransactionType.DISCOVERY_CREDITS}' and order_type <> '${loyaltyTransactionType.DISCOVERY_CREDITS_EXPIRY}'  and order_type <> '${loyaltyTransactionType.DISCOVERY_CREDITS_REFUND}'`;

    const results = await this.roDb
      .raw(query, { id })
      .then(result => result.rows);

    return get(results, '[0].balance', 0);
  }

  // eslint-disable-next-line max-params
  async credit(referenceOrderId, orderType, customerId, amount, currencyId) {
    await this.context.walletAccount.credit(
      customerId,
      currencyId,
      amount,
      orderType,
      referenceOrderId
    );
    return this.save({
      referenceOrderId,
      orderType,
      credit: amount,
      customerId,
      currencyId,
    });
  }

  // eslint-disable-next-line max-params
  async debit(referenceOrderId, orderType, customerId, amount, currencyId) {
    // amountsTodebit => cashback, referral or regular credits
    const {
      cashback,
      cashbackExpiry,
      referral,
      referralExpiry,
      regular,
      discovery,
      discoveryExpiry,
      account,
    } = await this.context.walletAccount.debit(
      customerId,
      currencyId,
      amount,
      orderType,
      referenceOrderId
    );
    if (cashback && Number(cashback) > 0) {
      const remainingCashbacks = await this.context.walletAccountCashback.getRemainedByWalletAccountId(
        account.id
      );
      let tempCashback = cashback;
      for (const rc of remainingCashbacks) {
        if (Number(tempCashback) >= Number(rc.remainingCashback)) {
          // eslint-disable-next-line no-await-in-loop
          await this.context.walletAccountCashback.save({
            id: rc.id,
            consumed: Number(rc.consumed) + Number(rc.remainingCashback),
          });
          // eslint-disable-next-line no-await-in-loop
          await this.save({
            referenceOrderId,
            orderType: loyaltyTransactionType.CASHBACK,
            debit: rc.remainingCashback,
            customerId,
            currencyId,
          });
          tempCashback = Number(tempCashback) - Number(rc.remainingCashback);
          if (Number(tempCashback) <= 0) {
            break;
          }
        } else {
          // eslint-disable-next-line no-await-in-loop
          await this.context.walletAccountCashback.save({
            id: rc.id,
            consumed: Number(rc.consumed) + Number(tempCashback),
          });
          // eslint-disable-next-line no-await-in-loop
          await this.save({
            referenceOrderId,
            orderType: loyaltyTransactionType.CASHBACK,
            debit: tempCashback,
            customerId,
            currencyId,
          });
          break;
        }
      }
    }
    if (cashbackExpiry && Number(cashbackExpiry) > 0) {
      await this.save({
        referenceOrderId,
        orderType: loyaltyTransactionType.CASHBACK_EXPIRY,
        debit: cashbackExpiry,
        customerId,
        currencyId,
      });
    }
    if (referral && Number(referral) > 0) {
      const remainingReferrals = await this.context.walletAccountReferral.getRemainedByWalletAccountId(
        account.id
      );
      let tempReferral = referral;
      for (const rc of remainingReferrals) {
        if (Number(tempReferral) >= Number(rc.remainingReferral)) {
          // eslint-disable-next-line no-await-in-loop
          await this.context.walletAccountReferral.save({
            id: rc.id,
            consumed: Number(rc.consumed) + Number(rc.remainingReferral),
          });
          // eslint-disable-next-line no-await-in-loop
          await this.save({
            referenceOrderId,
            orderType: loyaltyTransactionType.REFERRAL,
            debit: rc.remainingReferral,
            customerId,
            currencyId,
          });
          tempReferral = Number(tempReferral) - Number(rc.remainingReferral);
          if (Number(tempReferral) <= 0) {
            break;
          }
        } else {
          // eslint-disable-next-line no-await-in-loop
          await this.context.walletAccountReferral.save({
            id: rc.id,
            consumed: Number(rc.consumed) + Number(tempReferral),
          });
          // eslint-disable-next-line no-await-in-loop
          await this.save({
            referenceOrderId,
            orderType: loyaltyTransactionType.REFERRAL,
            debit: tempReferral,
            customerId,
            currencyId,
          });
          break;
        }
      }
    }
    if (referralExpiry && Number(referralExpiry) > 0) {
      await this.save({
        referenceOrderId,
        orderType: loyaltyTransactionType.REFERRAL_EXPIRY,
        debit: referralExpiry,
        customerId,
        currencyId,
      });
    }
    if (discovery && Number(discovery) > 0) {
      const orderSet = await this.context.orderSet.getById(referenceOrderId);
      if (orderSet) {
        const brandLocation = await this.context.brandLocation.getById(
          orderSet.brandLocationId
        );
        if (brandLocation) {
          const discoveryCredit = await this.context.discoveryCredit.getByCustomerAndCurrencyId(
            customerId,
            currencyId
          );
          if (discoveryCredit) {
            await this.save({
              referenceOrderId,
              orderType: loyaltyTransactionType.DISCOVERY_CREDITS,
              debit: discovery,
              customerId,
              currencyId,
            });

            await this.context.discoveryCreditRedemption.save({
              discoveryCreditId: discoveryCredit.id,
              brandLocationId: brandLocation.id,
              brandId: brandLocation.brandId,
              referenceOrderId,
              amount: discovery,
            });
          }
        }
      }
    }
    if (discoveryExpiry && Number(discoveryExpiry) > 0) {
      // !!DCBYPASS!!
      // await this.save({
      //   referenceOrderId,
      //   orderType: loyaltyTransactionType.DISCOVERY_CREDITS_EXPIRY,
      //   debit: discoveryExpiry,
      //   customerId,
      //   currencyId,
      // });
    }
    if (regular && Number(regular) > 0) {
      await this.save({
        referenceOrderId,
        orderType,
        debit: regular,
        customerId,
        currencyId,
      });
    }
  }

  async validateUpdateCofeCredits(input) {
    const errors = [];
    const customer = await this.context.customer.getById(input.customerId);
    if (!customer) {
      errors.push(updateCofeCreditsError.INVALID_CUSTOMER);
    }
    const currency = await this.context.currency.getById(input.currencyId);
    if (!currency) {
      errors.push(updateCofeCreditsError.INVALID_CURRENCY);
    }
    const amount = Number.parseFloat(input.amount);
    if (amount <= 0) {
      errors.push(updateCofeCreditsError.INVALID_AMOUNT);
    } else if (input.operationType === updateCofeCreditsTransactionType.DEBIT) {
      const balance = await this.getBalanceByCustomer(
        input.customerId,
        input.currencyId
      );
      if (balance < amount) {
        errors.push(updateCofeCreditsError.INVALID_AMOUNT);
      }
    }

    if (input.operationType === updateCofeCreditsTransactionType.CREDIT && !input.reason) {
      errors.push(updateCofeCreditsError.REASON_MUST_BE_SET);
    }

    return errors;
  }

  async updateCofeCredits(input) {
    const action =
      input.operationType === updateCofeCreditsTransactionType.CREDIT
        ? 'credit'
        : 'debit';
    return this[action](
      `ADDED_BY_USER_${input.userId}`, // user who triggered this update
      loyaltyTransactionType.ADMIN_PANEL,
      input.customerId,
      input.amount,
      input.currencyId
    );
  }

  async validateAddCreditsForCustomers({ currencyId }) {
    const errors = [];

    const currency = await this.context.currency.getById(currencyId);

    if (!currency) {
      errors.push(addCreditsForCustomersPayloadError.INVALID_CUSTOMER);
    }

    return errors;
  }

  async addCreditsForCustomers({
    currencyId,
    amount,
    fileUrl,
    operationType,
    userId,
    justSync,
  }) {
    const action =
      operationType === updateCofeCreditsTransactionType.CREDIT
        ? 'credit'
        : 'debit';

    const errors = [];
    let customers = [];
    const currency = await this.context.currency.getById(currencyId);

    if (fileUrl && amount) {
      const pms = new Promise(async resolve => {
        const list = await csvToJSON({ uri: fileUrl });
        if (Array.isArray(list)) {
          const invalidField = find(list, n => n.length !== 1);
          if (invalidField) {
            resolve({
              error: addCreditsForCustomersPayloadError.INVALID_CUSTOMER,
              list: [],
            });
          } else {
            resolve({
              list: map(list, chunk => {
                return chunk[0];
              }),
            });
          }
        } else {
          resolve({
            error: addCreditsForCustomersPayloadError.INVALID_FORMAT,
            list: [],
          });
        }
      });
      const { list: listArray, error } = await pms;
      if (error) {
        return { customers, errors: [error] };
      }
      customers = listArray;
    }
    if (customers.length > 0) {
      customers = uniq(
        filter(map(customers, c => (c ? c.trim() : '')), p => p.length > 0)
      );

      if (customers && customers.length > 0) {
        if (justSync) {
          const promises = [];
          map(customers, customerId =>
            promises.push(this.context.walletAccount.getAccounts(customerId))
          );
          await Promise.all(promises);
        } else {
          const promises = [];
          map(customers, customerId =>
            promises.push(
              this[action](
                `ADDED_BY_USER_${userId}`, // user who triggered this update
                loyaltyTransactionType.ADMIN_PANEL_SCRIPT,
                customerId,
                amount,
                currency.id
              )
            )
          );
          await Promise.all(promises);
        }
      }
    }
    return { customers, errors };
  }

  async getTransactions({ customerId, filters, paging }) {
    const { currencyId, type } = filters;
    let orderTypes = [];
    switch (type) {
      case loyaltyTransactionType.CASHBACK:
        orderTypes = [
          loyaltyTransactionType.CASHBACK,
          loyaltyTransactionType.CASHBACK_EXPIRY,
          loyaltyTransactionType.CASHBACK_REFUND,
        ];
        break;
      case loyaltyTransactionType.REFERRAL:
        orderTypes = [
          loyaltyTransactionType.REFERRAL,
          loyaltyTransactionType.REFERRAL_EXPIRY,
          loyaltyTransactionType.REFERRAL_REFUND,
        ];
        break;
      case loyaltyTransactionType.DISCOVERY_CREDITS:
        orderTypes = [
          loyaltyTransactionType.DISCOVERY_CREDITS,
          loyaltyTransactionType.DISCOVERY_CREDITS_EXPIRY,
          loyaltyTransactionType.DISCOVERY_CREDITS_REFUND,
        ];
        break;
      case loyaltyTransactionType.LOYALTY_ORDER:
        orderTypes = [
          loyaltyTransactionType.LOYALTY_ORDER,
          loyaltyTransactionType.ADMIN_PANEL,
          loyaltyTransactionType.ORDER_SET,
          loyaltyTransactionType.ORDER_SET_REFUND,
        ];
        break;
      default:
        orderTypes = [];
        break;
    }
    const query = this.roDb(this.tableName)
      .where('customer_id', customerId)
      .where('currency_id', currencyId)
      .whereRaw('credit != debit')
      .whereIn('order_type', orderTypes)
      .orderBy('created_at', 'desc');

    const rsp = {};
    rsp.items = await addPaging(query, paging);
    // eslint-disable-next-line complexity
    rsp.items = map(rsp.items, async i => {
      const node = {
        amount: Number(i.debit) > 0 ? Number(i.debit) : Number(i.credit),
        action: i.orderType,
        type:
          Number(i.debit) > 0
            ? transactionType.DEBITED
            : transactionType.CREDITED,
        currency: addLocalizationField(
          addLocalizationField(
            await this.context.currency.getById(i.currencyId),
            'symbol'
          ),
          'subunitName'
        ),
      };
      let model = null;
      switch (type) {
        // eslint-disable-next-line no-case-declarations
        case loyaltyTransactionType.CASHBACK:
          switch (i.orderType) {
            case loyaltyTransactionType.CASHBACK:
            case loyaltyTransactionType.CASHBACK_REFUND:
              model = 'orderSet';
              break;
            case loyaltyTransactionType.CASHBACK_EXPIRY:
              model = 'coupon';
              break;
            default:
              node.action = loyaltyTransactionType.OTHER;
              break;
          }

          if (model) {
            node[model] = uuid.validate(i.referenceOrderId)
              ? this.context[model].getById(i.referenceOrderId)
              : null;
          }
          break;
        case loyaltyTransactionType.REFERRAL:
          switch (i.orderType) {
            case loyaltyTransactionType.REFERRAL:
            case loyaltyTransactionType.REFERRAL_REFUND:
              model = 'referral';
              break;
            case loyaltyTransactionType.REFERRAL_EXPIRY:
              break;
            default:
              node.action = loyaltyTransactionType.OTHER;
              break;
          }

          if (model) {
            node[model] = uuid.validate(i.referenceOrderId)
              ? this.context[model].getById(i.referenceOrderId)
              : null;
          }
          break;
        case loyaltyTransactionType.DISCOVERY_CREDITS:
          switch (i.orderType) {
            case loyaltyTransactionType.DISCOVERY_CREDITS:
            case loyaltyTransactionType.DISCOVERY_CREDITS_REFUND:
              model = 'orderSet';
              break;
            case loyaltyTransactionType.DISCOVERY_CREDITS_EXPIRY:
              break;
            default:
              node.action = loyaltyTransactionType.OTHER;
              break;
          }

          if (model) {
            node[model] = uuid.validate(i.referenceOrderId)
              ? this.context[model].getById(i.referenceOrderId)
              : null;
          }
          break;
        case loyaltyTransactionType.LOYALTY_ORDER:
          switch (i.orderType) {
            case loyaltyTransactionType.LOYALTY_ORDER:
              model = 'loyaltyOrder';
              break;
            case loyaltyTransactionType.ORDER_SET:
            case loyaltyTransactionType.ORDER_SET_REFUND:
              model = 'orderSet';
              break;
            case loyaltyTransactionType.ADMIN_PANEL:
              break;
            default:
              node.action = loyaltyTransactionType.OTHER;
              break;
          }

          if (model) {
            node[model] = uuid.validate(i.referenceOrderId)
              ? this.context[model].getById(i.referenceOrderId)
              : null;
          }
          break;
        default:
          break;
      }

      return node;
    });

    return rsp;
  }

  async cashbackAmountForOrder(referenceOrderId) {
    const result = await this.roDb(this.tableName)
      .select({
        cashbackAmount: this.roDb.raw('sum(debit)')
      })
      .where('order_type', loyaltyTransactionType.CASHBACK)
      .andWhere('reference_order_id', referenceOrderId)
      .first();
    return Number(result?.cashbackAmount || 0);
  }
}

module.exports = LoyaltyTransaction;
