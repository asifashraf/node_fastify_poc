const { map, groupBy, find, filter } = require('lodash');
const moment = require('moment');
const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');
const { microservices } = require('../../../config');
const {
  loyaltyTransactionType,
  countryConfigurationKeys,
  creditTypes,
} = require('../root/enums');
const { defaultExpiryPeriod } = require('../../../config');
const CurrencyValue = require('../../lib/currency');
const {
  objTransformToCamelCase,
  transformToCamelCase,
} = require('../../lib/util');
const { addLocalizationField } = require('../../lib/util');
const { publishVerifiedEmailToBraze } = require('./../../lib/braze');
const Money = require('../../lib/currency');

const todayUnix = () =>
  moment(`${moment().format('YYYY-MM-DD')}T00:00:00Z`).unix();

const {
  kinesisEventTypes: {
    walletSaveCreateAccountsFromTransactions,
    walletSaveDebit,
  },
} = require('../../lib/aws-kinesis-logging');

class WalletAccounts extends BaseModel {
  constructor(db, context) {
    super(db, 'wallet_accounts', context);
    this.loaders = createLoaders(this);
  }

  async createAccountsFromTransactions(customerId) {
    const accounts = [];
    const transactionsRaw = await this.db
      .from('loyalty_transactions')
      .join('customers', 'customers.id', 'loyalty_transactions.customer_id')
      .select('loyalty_transactions.*')
      .where('loyalty_transactions.customer_id', customerId)
      // .orderBy('loyalty_transactions.currency_id', 'asc')
      .orderBy('loyalty_transactions.created_at', 'asc');
    const groupedTransactions = groupBy(transactionsRaw, o => o.currencyId);
    await Promise.all(
      map(groupedTransactions, async (transactions, currencyId) => {
        const account = await this.createAccount(
          customerId,
          currencyId,
          transactions
        );
        accounts.push(account);
      })
    );
    const walletAccountId = await this.save(accounts);
    this.context.kinesisLogger.sendLogEvent(
      { walletAccountId, accounts },
      walletSaveCreateAccountsFromTransactions
    );
    return accounts;
  }

  async createAccount(customerId, currencyId, transactions) {
    const customer = await this.context.customer.getById(customerId);
    const currency = await this.context.currency.getById(currencyId);
    const referralExpiryPeriodDb = await this.context.countryConfiguration.getByKey(
      countryConfigurationKeys.REFERRAL_EXPIRY_PERIOD,
      customer.countryId
    );
    const account = {
      customerId,
      currencyId,
      total: 0,
      regularAmount: new CurrencyValue(
        0,
        currency.decimalPlace,
        currency.lowestDenomination
      ),
      referralAmount: new CurrencyValue(
        0,
        currency.decimalPlace,
        currency.lowestDenomination
      ),
      referralAmountExpiresOn: 0,
    };

    // need to get it from config
    const referralExpiryPeriod = referralExpiryPeriodDb
      ? Number(referralExpiryPeriodDb.configurationValue)
      : defaultExpiryPeriod;

    map(transactions, transaction => {
      const credit = Number.parseFloat(transaction.credit);
      const debit = Number.parseFloat(transaction.debit);
      const transactionUnixDate = moment(
        `${moment(transaction.createdAt).format('YYYY-MM-DD')}T00:00:00Z`
      ).unix();
      const referralUnixStartDate = moment('2020-09-13T00:00:00Z').unix();

      if (credit) {
        if (
          transaction.orderType === loyaltyTransactionType.REFERRAL &&
          transactionUnixDate >= referralUnixStartDate
        ) {
          const momentObj = account.referralAmountExpiresOn
            ? moment.unix(account.referralAmountExpiresOn)
            : moment(transaction.createdAt);

          account.referralAmount = account.referralAmount.add(credit);
          account.referralAmountExpiresOn = momentObj
            .add(referralExpiryPeriod, 'hours')
            .unix();
        } else {
          account.regularAmount = account.regularAmount.add(credit);
        }
      }

      if (debit) {
        if (
          account.referralAmount.value > 0 &&
          transactionUnixDate <= account.referralAmountExpiresOn
        ) {
          if (debit > account.referralAmount.value) {
            // get the rest that needs to be subtracted from regular amount
            const rest = account.referralAmount
              .sub(debit)
              .mult(-1)
              .toCurrencyValue();

            // referral amount and expires on is 0
            account.referralAmount = new CurrencyValue(
              0,
              currency.decimalPlace,
              currency.lowestDenomination
            );
            account.referralAmountExpiresOn = 0;

            // subtract the rest from regular amount
            account.regularAmount = account.regularAmount.sub(rest);
          } else {
            account.referralAmount = account.referralAmount.sub(debit);
          }
        } else {
          account.regularAmount = account.regularAmount.sub(debit);
        }
      }
    });
    account.regularAmount = account.regularAmount.toCurrencyValue();
    account.referralAmount = account.referralAmount.toCurrencyValue();
    account.total = new CurrencyValue(
      0,
      currency.decimalPlace,
      currency.lowestDenomination
    )
      .add(account.regularAmount)
      .add(account.referralAmount)
      .toCurrencyValue();
    return account;
  }

  // checkReferralCredits(account) {
  //   if (account && account.referralAmountExpiresOn > 0) {
  //     if (account.referralAmountExpiresOn < todayUnix()) {
  //       account.referralAmountExpiresOn = 0;
  //       account.referralAmount = 0;
  //     }
  //   }
  //   return account;
  // }

  amountsToCurrencyValues(account, customerId, currency) {
    if (account) {
      account.regularAmount = new CurrencyValue(
        account.regularAmount,
        currency.decimalPlace,
        currency.lowestDenomination
      );
      account.referralAmount = new CurrencyValue(
        account.referralAmount,
        currency.decimalPlace,
        currency.lowestDenomination
      );
      account.cashbackAmount = new CurrencyValue(
        account.cashbackAmount,
        currency.decimalPlace,
        currency.lowestDenomination
      );
      account.discoveryAmount = new CurrencyValue(
        account.discoveryAmount,
        currency.decimalPlace,
        currency.lowestDenomination
      );
    } else {
      account = {
        customerId,
        currencyId: currency.id,
        total: 0,
        regularAmount: new CurrencyValue(
          0,
          currency.decimalPlace,
          currency.lowestDenomination
        ),
        referralAmount: new CurrencyValue(
          0,
          currency.decimalPlace,
          currency.lowestDenomination
        ),
        referralAmountExpiresOn: 0,
        cashbackAmount: new CurrencyValue(
          0,
          currency.decimalPlace,
          currency.lowestDenomination
        ),
        cashbackAmountExpiresOn: 0,
        discoveryAmount: new CurrencyValue(
          0,
          currency.decimalPlace,
          currency.lowestDenomination
        ),
        // For now, we can keep this line, when this column remove from the table we have to also remove it here
        discoveryAmountExpiresOn: 0,
      };
    }
    return account;
  }

  // eslint-disable-next-line max-params
  async credit(customerId, currencyId, amount, orderType, referenceOrderId) {
    const currency = await this.context.currency.getById(currencyId);
    let account = await this.getByCustomerIdAndCurrencyId(
      customerId,
      currencyId
    );
    account = this.amountsToCurrencyValues(account, customerId, currency);
    let cashbackPromo;
    if (orderType === loyaltyTransactionType.REFERRAL) {
      const customer = await this.context.customer.getById(customerId);
      const referralExpiryPeriodDb = await this.context.countryConfiguration.getByKey(
        countryConfigurationKeys.REFERRAL_EXPIRY_PERIOD,
        customer.countryId
      );
      const referralExpiryPeriod = referralExpiryPeriodDb
        ? Number(referralExpiryPeriodDb.configurationValue)
        : defaultExpiryPeriod;
      const momentObj = account.referralAmountExpiresOn
        ? moment.unix(account.referralAmountExpiresOn)
        : moment();

      account.referralAmount = account.referralAmount.add(amount);
      account.referralAmountExpiresOn = momentObj
        .add(referralExpiryPeriod, 'hours')
        .unix();
    } else if (orderType === loyaltyTransactionType.CASHBACK) {
      const { couponId } = await this.context.orderSet.getById(
        referenceOrderId
      );
      if (couponId) {
        const { cashbackExpireInDays } = await this.context.coupon.getById(
          couponId
        );
        const momentObj = moment();
        const newExpiryDate = momentObj
          .add(parseInt(cashbackExpireInDays, 10) * 24, 'hours')
          // .subtract(2, 'days') // test
          .unix();

        cashbackPromo = {
          amount,
          couponId,
          deprecated: false,
          expiresOn: newExpiryDate,
        };

        account.cashbackAmount = account.cashbackAmount.add(amount);
        account.cashbackAmountExpiresOn =
          account.cashbackAmountExpiresOn > newExpiryDate
            ? account.cashbackAmountExpiresOn
            : newExpiryDate;
      }
    } else if (
      orderType === loyaltyTransactionType.DISCOVERY_CREDITS ||
      orderType === loyaltyTransactionType.DISCOVERY_CREDITS_REFUND
    ) {
      const {
        expiresOn: discoveryCreditExpiresOn,
      } = await this.context.discoveryCredit.getByCustomerAndCurrencyId(
        customerId,
        currencyId
      );
      // console.log('discoveryCreditExpiresOn', discoveryCreditExpiresOn);
      account.discoveryAmount = account.discoveryAmount.add(amount);
      // prefer expiry date over number of days
      // For now, we can keep this line, when this column remove from the table we have to also remove it here
      account.discoveryAmountExpiresOn = discoveryCreditExpiresOn;
    } else {
      // console.log('HERE', amount, account.regularAmount);
      account.regularAmount = account.regularAmount.add(amount);
    }

    // const cashbacks = await this.context.walletAccountCashback.getRemainedByWalletAccountId(
    //   account.id
    // );
    // let totalCashback = null;
    // if (cashbacks && cashbacks.length > 0) {
    //   totalCashback = sumBy(cashbacks, cb => Number(cb.amount));
    // }

    account.regularAmount = account.regularAmount.toCurrencyValue();
    account.referralAmount = account.referralAmount.toCurrencyValue();
    account.cashbackAmount = account.cashbackAmount.toCurrencyValue();
    account.discoveryAmount = account.discoveryAmount.toCurrencyValue();
    account.total = new CurrencyValue(
      0,
      currency.decimalPlace,
      currency.lowestDenomination
    )
      .add(account.regularAmount)
      .add(account.referralAmount)
      .add(account.cashbackAmount)
      .toCurrencyValue();
    const walletAccountId = await this.save(account);
    if (cashbackPromo) {
      await this.context.walletAccountCashback.save({
        ...cashbackPromo,

        ...{ walletAccountId },
      });
    }
    this.sendWallerAccountToBraze(currency, account);
    return walletAccountId;
  }

  async cashbacks(walletAccountId) {
    return this.context.walletAccountCashback.getRemainedByWalletAccountId(
      walletAccountId
    );
  }

  // eslint-disable-next-line complexity
  async debit(customerId, currencyId, amount, orderType) {
    const breakDownCredits = {
      cashback: 0,
      cashbackExpiry: 0,
      referral: 0,
      referralExpiry: 0,
      regular: 0,
      discovery: 0,
      discoveryExpiry: 0,
    };
    const currency = await this.context.currency.getById(currencyId);
    let account = await this.getByCustomerIdAndCurrencyId(
      customerId,
      currencyId
    );
    account = this.amountsToCurrencyValues(account, customerId, currency);

    let remainingAmount = new CurrencyValue(
      amount,
      currency.decimalPlace,
      currency.lowestDenomination
    );

    if (
      orderType === loyaltyTransactionType.DISCOVERY_CREDITS &&
      account.discoveryAmount.value > 0
    ) {
      if (account.discoveryAmount.value >= remainingAmount.value) {
        breakDownCredits.discovery = remainingAmount.value;
        account.discoveryAmount = account.discoveryAmount.sub(remainingAmount);
        remainingAmount.value = 0;
      }
    } else {
      if (
        account.cashbackAmount.value > 0 &&
        orderType !== loyaltyTransactionType.REFERRAL_EXPIRY &&
        orderType !== loyaltyTransactionType.DISCOVERY_CREDITS_EXPIRY
      ) {
        if (account.cashbackAmount.value > remainingAmount.value) {
          if (orderType === loyaltyTransactionType.CASHBACK_EXPIRY) {
            breakDownCredits.cashbackExpiry = remainingAmount.value;
          } else {
            breakDownCredits.cashback = remainingAmount.value;
          }

          account.cashbackAmount = account.cashbackAmount.sub(remainingAmount);
          remainingAmount.value = 0;
        } else {
          if (orderType === loyaltyTransactionType.CASHBACK_EXPIRY) {
            breakDownCredits.cashbackExpiry = account.cashbackAmount.value;
          } else {
            breakDownCredits.cashback = account.cashbackAmount.value;
          }

          remainingAmount = remainingAmount.sub(account.cashbackAmount);
          account.cashbackAmount.value = 0;
          account.cashbackAmountExpiresOn = 0;
        }
      }
      if (
        remainingAmount.value > 0 &&
        account.referralAmount.value > 0 &&
        orderType !== loyaltyTransactionType.CASHBACK_EXPIRY &&
        orderType !== loyaltyTransactionType.DISCOVERY_CREDITS_EXPIRY
      ) {
        if (account.referralAmount.value > remainingAmount.value) {
          if (orderType === loyaltyTransactionType.REFERRAL_EXPIRY) {
            breakDownCredits.referralExpiry = remainingAmount.value;
          } else {
            breakDownCredits.referral = remainingAmount.value;
          }

          account.referralAmount = account.referralAmount.sub(remainingAmount);
          remainingAmount.value = 0;
        } else {
          if (orderType === loyaltyTransactionType.REFERRAL_EXPIRY) {
            breakDownCredits.referralExpiry = account.referralAmount.value;
          } else {
            breakDownCredits.referral = account.referralAmount.value;
          }

          remainingAmount = remainingAmount.sub(account.referralAmount);
          account.referralAmount.value = 0;
          account.referralAmountExpiresOn = 0;
        }
      }

      // !!DCBYPASS!!
      // if (orderType === loyaltyTransactionType.DISCOVERY_CREDITS_EXPIRY) {
      //   breakDownCredits.discoveryExpiry = remainingAmount.value;
      //   account.discoveryAmount = account.discoveryAmount.sub(remainingAmount);
      //   remainingAmount.value = 0;
      //   // For now, we can keep this line, when this column remove from the table we have to also remove it here
      //   account.discoveryAmountExpiresOn = 0;
      // }

      if (
        orderType !== loyaltyTransactionType.CASHBACK_EXPIRY &&
        orderType !== loyaltyTransactionType.REFERRAL_EXPIRY &&
        orderType !== loyaltyTransactionType.DISCOVERY_CREDITS_EXPIRY &&
        remainingAmount.value > 0
      ) {
        breakDownCredits.regular = remainingAmount.value;
        account.regularAmount = account.regularAmount.sub(remainingAmount);
      }
    }

    account.regularAmount = account.regularAmount.toCurrencyValue();
    account.referralAmount = account.referralAmount.toCurrencyValue();
    account.cashbackAmount = account.cashbackAmount.toCurrencyValue();
    account.discoveryAmount = account.discoveryAmount.toCurrencyValue();
    account.total = new CurrencyValue(
      0,
      currency.decimalPlace,
      currency.lowestDenomination
    )
      .add(account.regularAmount)
      .add(account.referralAmount)
      .add(account.cashbackAmount)
      .toCurrencyValue();
    const walletAccountId = await this.save(account);
    this.context.kinesisLogger.sendLogEvent(
      { walletAccountId, account },
      walletSaveDebit
    );
    breakDownCredits.account = account;
    this.sendWallerAccountToBraze(currency, account);
    return breakDownCredits;
  }

  getByCustomerId(customerId) {
    return this.db(this.tableName).where('customer_id', customerId);
  }

  async getByCustomerIdAndCurrencyId(customerId, currencyId) {
    return this.roDb(this.tableName)
      .where('customer_id', customerId)
      .andWhere('currency_id', currencyId)
      .first()
      .then(objTransformToCamelCase);
  }

  async expireAll(customerId) {
    await this.expireForAllCustomers(customerId);
  }

  async getAccounts(customerId) {
    const currencyIds = (await this.context.country.getAllActive()).map(
      country => country.currencyId
    );
    let accounts = await this.getByCustomerId(customerId);
    if (accounts.length === 0) {
      await this.createAccountsFromTransactions(customerId);
    } else {
      await this.expireAll(customerId);
    }
    accounts = await this.getByCustomerId(customerId);
    await Promise.all(
      map(currencyIds, async currencyId => {
        const currencyAccount = find(
          accounts,
          a => a.currencyId === currencyId
        );
        if (!currencyAccount) {
          await this.save({
            customerId,
            currencyId,
            total: 0,
            regularAmount: 0,
            referralAmount: 0,
            cashbackAmount: 0,
            referralAmountExpiresOn: 0,
            cashbackAmountExpiresOn: 0,
          });
        }
      })
    );

    const updatedAccounts = await this.getByCustomerId(customerId);
    await Promise.all(
      map(updatedAccounts, async account => {
        const discoveryCredit = await this.context.discoveryCredit.getByCustomerAndCurrencyId(account.customerId, account.currencyId);
        if (discoveryCredit) {
          account.discoveryAmountExpiresOn = account.discoveryAmount > 0 ? discoveryCredit.expiresOn : null;
        } else {
          account.discoveryAmount = '0.000';
          account.discoveryAmountExpiresOn = null;
        }
      })
    );
    return updatedAccounts;
  }

  async getAccount({ customerId, countryId }) {
    await this.getAccounts(customerId);
    await this.expireForAllCustomers(customerId);

    const country = await this.context.country.getById(countryId);

    const account = await this.getByCustomerIdAndCurrencyId(
      customerId,
      country.currencyId
    );
    // If account has a discovery
    if (account.discoveryAmount > 0) {
      const discoveryCredit = await this.context.discoveryCredit.getByCustomerAndCurrencyId(
        customerId,
        country.currencyId
      );
      if (discoveryCredit) {
        account.discoveryAmountExpiresOn = discoveryCredit.expiresOn;
      }
    }
    account.timeZoneIdentifier = country.timeZoneIdentifier;
    return account;
  }

  getCurrency(walletAccountId) {
    return this.loaders.currency.load(walletAccountId);
  }

  async getWalletAccountByCountryCode(countryCode) {
    const customerId = this.context.auth.id;
    const country = await this.context.country.getByCode(countryCode);
    const account = await this.getByCustomerIdAndCurrencyId(
      customerId,
      country.currencyId
    );
    if (!account) {
      return this.getAccounts(customerId).then(accounts => {
        return accounts.find(
          account => account.currencyId === country.currencyId
        );
      });
    }
    return account;
  }

  async getAccountLiteByCountryId(countryId) {
    const customerId = this.context.auth.id;
    const country = await this.context.country.getById(countryId);

    const currencyPromise = this.context.currency.getById(country.currencyId);
    const customerPromise = this.roDb(this.context.customer.tableName)
      .select(
        'first_name as firstName',
        'last_name as lastName',
        'is_email_verified as isEmailVerified',
        'is_phone_verified as isPhoneVerified'
      )
      .where('id', customerId)
      .first();
    const accountPromise = this.getByCustomerIdAndCurrencyId(
      customerId,
      country.currencyId
    );

    const discoveryPromise = this.context.discoveryCredit.getByCustomerAndCurrencyId(
      customerId,
      country.currencyId
    );

    return Promise.all([customerPromise, accountPromise, currencyPromise, discoveryPromise]).then(
      ([customer, account, currency, discovery]) => {
        const accountInfo = account
          ? account
          : this.getAccounts(customerId).then(accounts => {
            return accounts.find(
              account => account.currencyId === country.currencyId
            );
          });

        const walletTotal = accountInfo
          ? Number(accountInfo.total) +
            (accountInfo.discoveryAmount && discovery
              ? Number(accountInfo.discoveryAmount)
              : 0)
          : 0;

        return {
          firstName: customer.firstName,
          lastName: customer.lastName,
          photo: microservices.customerProfilePictureEndpoint,
          isEmailVerified: customer.isEmailVerified,
          isPhoneVerified: customer.isPhoneVerified,
          walletTotal: new Money(
            walletTotal,
            currency.decimalPlace,
            currency.lowestDenomination
          ),
        };
      }
    );
  }

  // get all cashback and referrals to expire
  getAllToExpire() {
    return this.roDb(this.tableName)
      .where('cashback_amount_expires_on', '!=', 0)
      .where('cashback_amount', '>', 0)
      .whereNotNull('cashback_amount_expires_on')
      .andWhereRaw(`cashback_amount_expires_on < ${todayUnix()}`)
      .orWhereRaw(
        `( referral_amount_expires_on != 0 and referral_amount_expires_on is not null and referral_amount_expires_on < ${todayUnix()} and referral_amount > 0)`
      )
      .orWhereRaw(
        `( discovery_amount_expires_on != 0 and discovery_amount_expires_on is not null and discovery_amount_expires_on < ${todayUnix()} and discovery_amount > 0)`
      );
  }

  getDiscoveryToExpire() {
    const countryIds = this.getAllDiscoveryCreditExpiredCountry();
    return this.roDb(this.tableName)
      .whereRaw('discovery_amount > 0')
      .whereIn('country_id', countryIds);
  }

  async getDiscoveryToExpireForCustomer(customerId = null) {
    const discoveryCredits = await this.roDb('wallet_accounts as wa')
      .select('wa.*', 'cc.configuration_value as value')
      .joinRaw(
        `
        LEFT JOIN countries as c ON c.currency_id = wa.currency_id
        LEFT JOIN country_configuration as cc ON c.id = cc.country_id AND cc.configuration_key = 'DISCOVERY_CREDITS_EXPIRY_DATE'
      `
      )
      .whereRaw('(wa.discovery_amount > 0)')
      .where('wa.customer_id', customerId);
    const dCList = [];
    discoveryCredits.map(async dc => {
      if (
        todayUnix() >
        moment(dc.value)
          .parseZone()
          .endOf('day')
          .unix()
      )
        dCList.push(dc);
    });
    return dCList;
  }

  // Return country id list that its discovery credit is expired or not defined
  async getAllDiscoveryCreditExpiredCountry() {
    const countryConfigs = await this.roDb('country_configuration')
      .select('country_id, configuration_value as value')
      .where(
        'configuration_key',
        countryConfigurationKeys.DISCOVERY_CREDITS_EXPIRY_DATE
      );
    const countryIds = countryConfigs.map(async cc => {
      if (cc.value.length > 1) {
        return todayUnix() >
          moment(cc.value)
            .parseZone()
            .endOf('day')
            .unix()
          ? cc.countryId
          : null;
      }
      return cc.countryId;
    });
    return countryIds.filter(n => n);
  }

  async expireDiscoveryCredits(customerId = null) {
    // !!DCBYPASS!!
    return 0;
    // eslint-disable-next-line no-unreachable
    let index = 0;
    let discoveryCreditToExpire = [];
    if (customerId) {
      discoveryCreditToExpire = await this.getDiscoveryToExpireForCustomer(
        customerId
      );
    } else {
      discoveryCreditToExpire = await this.getDiscoveryToExpire();
    }
    if (
      Array.isArray(discoveryCreditToExpire) &&
      discoveryCreditToExpire.length > 0
    ) {
      // eslint-disable-next-line no-unused-vars
      for (const cb of discoveryCreditToExpire) {
        /*
        if (
          cb.discoveryAmountExpiresOn > 0 &&
          cb.discoveryAmountExpiresOn < todayUnix()
        ) {
        */
        // eslint-disable-next-line no-await-in-loop
        // !!DCBYPASS!!
        // await this.context.loyaltyTransaction.debit(
        //   `${cb.customerId}_${
        //     cb.discoveryAmount
        //   }_DISCOVERY_CREDITS_EXPIRY_${todayUnix()}`,
        //   loyaltyTransactionType.DISCOVERY_CREDITS_EXPIRY,
        //   cb.customerId,
        //   cb.discoveryAmount,
        //   cb.currencyId
        // );

        index++;
        // }
      }
    }
    return index;
  }

  async expireCashbacks(customerId = null) {
    let index = 0;
    let cashbackToExpire = [];
    if (customerId) {
      cashbackToExpire = await this.context.walletAccountCashback.getCashbackToExpireForCustomer(
        customerId
      );
    } else {
      cashbackToExpire = await this.context.walletAccountCashback.getCashbackToExpire();
    }

    if (Array.isArray(cashbackToExpire) && cashbackToExpire.length > 0) {
      for (const cb of cashbackToExpire) {
        if (cb.expiresOn > 0 && cb.expiresOn < todayUnix()) {
          // eslint-disable-next-line no-await-in-loop
          await this.context.loyaltyTransaction.debit(
            cb.couponId,
            loyaltyTransactionType.CASHBACK_EXPIRY,
            cb.customerId,
            cb.remainingCashback,
            cb.currencyId
          );

          // eslint-disable-next-line no-await-in-loop
          await this.context.walletAccountCashback.save({
            id: cb.id,
            expired: true,
          });
          index++;
        }
      }
    }
    return index;
  }

  async expireReferrals(customerId = null) {
    let index = 0;
    let referralToExpire = [];
    if (customerId) {
      referralToExpire = await this.context.walletAccountReferral.getReferralToExpireForCustomer(
        customerId
      );
    } else {
      referralToExpire = await this.context.walletAccountReferral.getReferralToExpire();
    }

    if (Array.isArray(referralToExpire) && referralToExpire.length > 0) {
      for (const cb of referralToExpire) {
        if (cb.expiresOn > 0 && cb.expiresOn < todayUnix()) {
          // eslint-disable-next-line no-await-in-loop
          await this.context.loyaltyTransaction.debit(
            `${cb.customerId}_${
              cb.amount
            }_DISCOVERY_CREDITS_EXPIRY_${todayUnix()}`,
            loyaltyTransactionType.REFERRAL_EXPIRY,
            cb.customerId,
            cb.remainingReferral,
            cb.currencyId
          );

          // eslint-disable-next-line no-await-in-loop
          await this.context.walletAccountReferral.save({
            id: cb.id,
            expired: true,
          });
          index++;
        }
      }
    }
    return index;
  }

  async expireForAllCustomers(customerId = null) {
    const cbExpired = await this.expireCashbacks(customerId);
    const dcExpired = await this.expireDiscoveryCredits(customerId);
    const rExpired = await this.expireReferrals(customerId);
    return {
      success: true,
      cashback: cbExpired,
      discoveryCredit: dcExpired,
      referral: rExpired,
    };
  }

  async dynamicCreditTypes({
    id,
    regularAmount,
    referralAmount,
    cashbackAmount,
    discoveryAmount,
    discoveryAmountExpiresOn,
  }) {
    const currencyVal = await this.getCurrency(id);
    const country = await this.context.currency.getCountry(currencyVal.id);
    const discoveryCredit = await this.context.discoveryCredit.getCountryConfig(country.id);
    const currency = addLocalizationField(
      addLocalizationField(currencyVal, 'symbol'),
      'subunitName',
    );

    const types = [];

    // regular - loyalty
    const regularAmountCV = new CurrencyValue(
      regularAmount ? regularAmount : 0,
      currency.decimalPlace,
      currency.lowestDenomination
    );
    types.push({
      type: creditTypes.REGULAR_CREDITS,
      amount: regularAmountCV,
      show: true,
      currency,
    });

    // discovery credits
    if (discoveryCredit) {
      const discoveryAmountCV = new CurrencyValue(
        discoveryAmount ? discoveryAmount : 0,
        currency.decimalPlace,
        currency.lowestDenomination,
      );
      types.push({
        type: creditTypes.DISCOVERY_CREDITS,
        amount: discoveryAmountCV,
        nearest:
          discoveryAmountCV.intValue > 0 && Number(discoveryAmountExpiresOn) > 0
            ? {
              amount: discoveryAmountCV,
              expiresOn: this.convertUnixtoFriendlyFormat(
                discoveryAmountExpiresOn,
              ),
              currency,
            }
            : null,
        show: true,
        currency,
      });
    }


    // referrals
    const nearestReferral = await this.context.walletAccountReferral.getNearestRemainedByWalletAccountId(
      id
    );
    const referralAmountCV = new CurrencyValue(
      referralAmount ? referralAmount : 0,
      currency.decimalPlace,
      currency.lowestDenomination
    );
    types.push({
      type: creditTypes.REFERRAL_CREDITS,
      amount: referralAmountCV,
      nearest: nearestReferral
        ? {
          amount: nearestReferral.amount,
          expiresOn: this.convertUnixtoFriendlyFormat(
            nearestReferral.expiresOn
          ),
          currency,
        }
        : null,
      show: true,
      currency,
    });

    // cashback
    const nearestCashback = await this.context.walletAccountCashback.getNearestRemainedByWalletAccountId(
      id
    );

    const cashbackAmountCV = new CurrencyValue(
      cashbackAmount ? cashbackAmount : 0,
      currency.decimalPlace,
      currency.lowestDenomination
    );
    types.push({
      type: creditTypes.CASHBACK_CREDITS,
      amount: cashbackAmountCV,
      nearest: nearestCashback
        ? {
          amount: nearestCashback.amount,
          expiresOn: this.convertUnixtoFriendlyFormat(
            nearestCashback.expiresOn
          ),
          currency,
        }
        : null,
      show: true,
      currency,
    });

    return types;
  }

  convertUnixtoFriendlyFormat(date) {
    return moment.unix(date).format('YYYY-MM-DDTHH:mm:ssZ');
  }

  async sendWallerAccountToBraze(
    { symbol },
    {
      id,
      customerId,
      total,
      regularAmount,
      referralAmount,
      cashbackAmount,
      discoveryAmount,
      discoveryAmountExpiresOn,
    }
  ) {
    const event = { customerId };
    symbol = symbol ? symbol.toString().toLowerCase() : 'unknown';
    event[symbol + '_total'] = total;
    event[symbol + '_regular_amount'] = regularAmount;
    event[symbol + '_referral_amount'] = referralAmount;
    event[symbol + '_cashback_amount'] = cashbackAmount;
    event[symbol + '_discovery_amount'] = discoveryAmount;
    event[symbol + '_discovery_amount_expires_on'] = discoveryAmountExpiresOn;

    const cbs = filter(
      await this.context.walletAccountCashback.getRemainedByWalletAccountId(id),
      c => Number(c.remainingCashback) > 0
    );

    event[symbol + '_cashback_remainings'] = map(cbs, c => c.remainingCashback);
    event[symbol.toLowerCase() + '_cashback_remainings_expiry'] = map(
      cbs,
      c => c.expiresOn
    );

    const ref = filter(
      await this.context.walletAccountReferral.getRemainedByWalletAccountId(id),
      c => Number(c.remainingReferral) > 0
    );

    event[symbol + '_referral_remainings'] = map(ref, c => c.remainingReferral);
    event[symbol + '_referral_remainings_expiry'] = map(ref, c => c.expiresOn);

    event.abc = { test: '2' };
    publishVerifiedEmailToBraze(event, null);
  }

  async getWalletAccount({ customerId, countryId }) {
    const country = await this.context.country.getById(countryId);
    let account = await this.getByCustomerIdAndCurrencyId(
      customerId,
      country.currencyId
    );
    if (!account) {
      account = await this.getAccount({ customerId, countryId });
    }
    if (account.discoveryAmount > 0) {
      const discoveryCredit = await this.context.discoveryCredit.getByCustomerAndCurrencyId(
        customerId,
        country.currencyId
      );
      if (discoveryCredit) {
        if (moment.unix(discoveryCredit.expiresOn).isAfter(moment())) {
          account.discoveryAmountExpiresOn = discoveryCredit.expiresOn;
        } else {
          account.discoveryAmount = 0;
          account.discoveryAmountExpiresOn = null;
        }
      } else {
        account.discoveryAmount = 0;
        account.discoveryAmountExpiresOn = null;
      }
    }
    // account.timeZoneIdentifier = country.timeZoneIdentifier;
    return account;
  }

  async getWalletSettingsAllCountries({ customerId }) {
    const query = `
        select wa.id, wa.total, wa.discovery_amount, wa.currency_id
        from wallet_accounts wa
        where wa.customer_id = ?
          `;
    const walletAccountsRaw = addLocalizationField(
      addLocalizationField(
        await this.roDb
          .raw(query, [customerId])
          .then(result => transformToCamelCase(result.rows)),
        'symbol'
      ),
      'name'
    );
    const walletAccounts = walletAccountsRaw.map(async walletAccount => {
      const account = {};
      account.id = walletAccount.id;
      const walletTotal = walletAccount.total;
      const discoveryCredit = await this.context.discoveryCredit.getByCustomerAndCurrencyId(customerId, walletAccount.currencyId);
      let discoveryAmount = walletAccount.discoveryAmount;
      if (!discoveryCredit) {
        discoveryAmount = 0;
      }
      account.currencyId = walletAccount.currencyId;
      account.total =
        Number.parseFloat(walletTotal) + Number.parseFloat(discoveryAmount);
      return account;
    });
    return walletAccounts;
  }
}

module.exports = WalletAccounts;
