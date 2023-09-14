const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');
const { first, map } = require('lodash');
const {
  referralStatusTypes,
  loyaltyTransactionType,
  countryConfigurationKeys,
} = require('./../root/enums');
const {
  contentTemplates,
  replacePlaceholders,
} = require('../../lib/push-notification');
const { notificationCategories } = require('../../lib/notifications');
const {
  now,
  transformToCamelCase,
  isNullOrUndefined,
} = require('../../lib/util');
const { defaultExpiryPeriod } = require('../../../config');

const KD = require('../../lib/currency');
const QueryHelper = require('../../lib/query-helper');
const ReferralReportFormatter = require('./referral-report-formatter');
const {
  createCustomerAnalyticsEvent,
  sendCustomerAnalyticsEventToQueue,
} = require('../../lib/customer-analytics');
const {
  adjustDeviceTypeIdentifiers,
  customerAnalyticsEvents,
} = require('../root/enums');
const moment = require('moment');

class Referral extends BaseModel {
  constructor(db, context) {
    super(db, 'referrals', context);
    this.loaders = createLoaders(this);
  }

  async customerReferredBy(customerId) {
    const transaction = await this.getReferralsQuery()
      .where('receiver_id', customerId)
      .then(first);
    if (transaction) {
      transaction.senderAmount = new KD(
        transaction.senderAmount,
        transaction.senderCurrencyDecimalPlace,
        transaction.senderCurrencyLowestDenomination
      ).value.toFixed(transaction.senderCurrencyDecimalPlace);
      transaction.receiverAmount = new KD(
        transaction.receiverAmount,
        transaction.receiverCurrencyDecimalPlace,
        transaction.receiverCurrencyLowestDenomination
      ).value.toFixed(transaction.receiverCurrencyDecimalPlace);
    }

    return transaction;
  }

  getReferralsQuery(query = null) {
    const db = query ? query : this.db(this.tableName);
    return db
      .select(
        'sender.id AS senderId',
        'sender.first_name AS senderFirstName',
        'sender.last_name AS senderLastName',
        'sender.email AS senderEmail',
        'sender.referral_code AS senderReferralCode',

        'receiver.id AS receiverId',
        'receiver.first_name AS receiverFirstName',
        'receiver.last_name AS receiverLastName',
        'receiver.email AS receiverEmail',
        'receiver.referral_code AS receiverReferralCode',

        'referrals.*',

        'senderCurrency.symbol AS senderCurrency',
        'senderCurrency.decimal_place AS senderCurrencyDecimalPlace',
        'senderCurrency.lowest_denomination AS senderCurrencyLowestDenomination',
        'receiverCurrency.symbol AS receiverCurrency',
        'receiverCurrency.decimal_place AS receiverCurrencyDecimalPlace',
        'receiverCurrency.lowest_denomination AS receiverCurrencyLowestDenomination'
      )
      .join('customers AS sender', 'sender.id', 'referrals.sender_id')
      .join(
        'currencies AS senderCurrency',
        'senderCurrency.id',
        'referrals.sender_currency_id'
      )
      .join('customers AS receiver', 'receiver.id', 'referrals.receiver_id')
      .join(
        'currencies AS receiverCurrency',
        'receiverCurrency.id',
        'referrals.receiver_currency_id'
      )
      .orderBy('created', 'desc');
  }

  async getReferralsCsv(stream, filters) {
    let query = this.roDb(this.tableName);
    query = this.getReferralsQuery(query);
    query = this.filterReferrals(query, filters);

    return query
      .stream(s => s.pipe(new ReferralReportFormatter()).pipe(stream))
      .catch(console.error);
  }

  async referredCustomers(customerId) {
    const query = this.getReferralsQuery().where('sender_id', customerId);
    const transactions = map(await query, r => {
      r.senderAmount = new KD(
        r.senderAmount,
        r.senderCurrencyDecimalPlace,
        r.senderCurrencyLowestDenomination
      ).value.toFixed(r.senderCurrencyDecimalPlace);
      r.receiverAmount = new KD(
        r.receiverAmount,
        r.receiverCurrencyDecimalPlace,
        r.receiverCurrencyLowestDenomination
      ).value.toFixed(r.receiverCurrencyDecimalPlace);
      return r;
    });
    return transactions;
  }

  filterReferrals(query, { status, searchText }) {
    if (!status) {
      status = 'ALL';
    }
    if (status !== 'ALL') {
      query.where('referrals.status', status);
    }

    if (searchText) {
      searchText = searchText.toLowerCase().trim();
      query.whereRaw(
        `(
        LOWER(sender.referral_code) like '%${searchText}%' or LOWER(sender.first_name) like '%${searchText}%' or LOWER(sender.last_name) like '%${searchText}%' or concat(LOWER(sender.first_name),' ', LOWER(sender.last_name)) like '%${searchText}%'
        or
        LOWER(receiver.referral_code) like '%${searchText}%' or LOWER(receiver.first_name) like '%${searchText}%' or LOWER(receiver.last_name) like '%${searchText}%' or concat(LOWER(receiver.first_name),' ', LOWER(receiver.last_name)) like '%${searchText}%'
      )`
      );
    }
    return query;
  }

  async referrals(filters, paging) {
    let query = this.getReferralsQuery();

    query = this.filterReferrals(query, filters);

    const rsp = await new QueryHelper(query)
      .addPaging(paging)
      .addCounting()
      .resolvePagedQuery();

    rsp.items = map(rsp.items, r => {
      r.senderAmount = new KD(
        r.senderAmount,
        r.senderCurrencyDecimalPlace,
        r.senderCurrencyLowestDenomination
      ).value.toFixed(r.senderCurrencyDecimalPlace);
      r.receiverAmount = new KD(
        r.receiverAmount,
        r.receiverCurrencyDecimalPlace,
        r.receiverCurrencyLowestDenomination
      ).value.toFixed(r.receiverCurrencyDecimalPlace);
      return r;
    });

    return rsp;
  }

  async referCustomerByCode(receiver, code) {
    const errors = [];
    const receiverCountryId = receiver.country_id
      ? receiver.country_id
      : receiver.countryId;
    const receiverCountry = await this.context.country.getById(
      receiverCountryId
    );
    const [customer] = await this.context.customer.getByReferralCode(code);
    const sender = customer;

    if (sender) {
      let senderCountry;
      if (receiver.country_id === sender.countryId) {
        senderCountry = receiverCountry;
      } else {
        senderCountry = await this.context.country.getById(sender.countryId);
      }
      if (senderCountry && receiverCountry) {
        const senderReferralAmount = senderCountry.senderReferralAmount
          ? senderCountry.senderReferralAmount
          : 0.0;
        const receiverReferralAmount = receiverCountry.receiverReferralAmount
          ? receiverCountry.receiverReferralAmount
          : 0.0;

        await this.save({
          senderId: sender.id,
          receiverId: receiver.id,
          senderAmount: senderReferralAmount,
          receiverAmount: receiverReferralAmount,
          status: referralStatusTypes.JOINED,
          joinedAt: now.get(),
          senderCurrencyId: senderCountry.currencyId,
          receiverCurrencyId: receiverCountry.currencyId,
        });

        await this.context.db
          .table('customers')
          .update({
            referredCount: sender.referredCount + 1,
          })
          .where('id', sender.id);
      }
    } else {
      // error
      // errors.push('INVALID_REFERRAL_CODE');
    }
    return { errors };
  }

  async validate() {
    const errors = [];

    return errors;
  }

  getReferralSender(receiverId) {
    return this.db
      .select('customers.*')
      .from(this.tableName)
      .leftJoin('customers', 'customers.id', `${this.tableName}.sender_id`)
      .where(`${this.tableName}.receiver_id`, receiverId)
      .then(transformToCamelCase)
      .then(first);
  }

  getReferralByReceiverId(receiverId) {
    return this.db(this.tableName)
      .where('receiver_id', receiverId)
      .then(transformToCamelCase)
      .then(first);
  }

  receiverActivated(id) {
    return this.db(this.tableName)
      .where({ id })
      .update({
        status: referralStatusTypes.ORDERED,
        receivedAt: now.get(),
      });
  }

  async rewardReferralSender({ orderSetId }) {
    const orderSet = await this.context.orderSet.getById(orderSetId);
    // console.log('orderSet', orderSet);
    if (!orderSet) {
      return false;
    }
    // we check if the customer that placed the order signed up with a
    // referral code and if it is the *first completed order*
    const referral = await this.getReferralByReceiverId(orderSet.customerId);

    // console.log('referral', referral);
    if (referral) {
      const firstCompletedOrder = await this.context.orderSet.getCustomerFirstCompletedOrder(
        referral.receiverId
      );
      if (!firstCompletedOrder || firstCompletedOrder.id === orderSetId) {
        const referralSender = await this.context.customer.getById(
          referral.senderId
        );
        const referralReceiver = await this.context.customer.getById(
          referral.receiverId
        );
        const referralSenderCountry = await this.context.country.getById(
          referralSender.countryId
        );

        const referralReceiverCountry = await this.context.country.getById(
          referralReceiver.countryId
        );

        if (referralSenderCountry && referralSenderCountry.isReferralActive) {
          const currency = await this.context.currency.getById(
            referralSenderCountry.currencyId
          );
          // give credits to referral sender on first order
          await this.context.loyaltyTransaction.credit(
            referral.id,
            loyaltyTransactionType.REFERRAL,
            referral.senderId,
            referral.senderAmount,
            referralSenderCountry.currencyId
          );
          // log referral
          const senderWalletAccount = await this.context.walletAccount.getByCustomerIdAndCurrencyId(
            referral.senderId,
            referralSenderCountry.currencyId
          );
          const receiverWalletAccount = await this.context.walletAccount.getByCustomerIdAndCurrencyId(
            referral.receiverId,
            referralReceiverCountry.currencyId
          );
          if (senderWalletAccount) {
            const referralExpiryPeriodDb = await this.context.countryConfiguration.getByKey(
              countryConfigurationKeys.REFERRAL_EXPIRY_PERIOD,
              referralSenderCountry.id
            );
            // need to get it from config
            const referralExpiryPeriod = referralExpiryPeriodDb
              ? Number(referralExpiryPeriodDb.configurationValue)
              : defaultExpiryPeriod;

            await this.context.walletAccountReferral.save({
              walletAccountId: senderWalletAccount.id,
              senderWalletAccountId: receiverWalletAccount
                ? receiverWalletAccount.id
                : null,
              amount: referral.senderAmount,
              expiresOn: moment()
                .add(referralExpiryPeriod, 'hours')
                .unix(),
            });
          }

          await this.receiverActivated(referral.id);
          await this.sendReceiverActivationNotification({
            amount: new KD(
              referral.senderAmount,
              currency.decimalPlace,
              currency.lowestDenomination
            ).toString(),
            currencyCode: currency.symbol,
            currencyCodeAr: currency.symbolAr,
            currencyCodeTr: currency.symbolTr,
            receiverName: `${referralReceiver.firstName} ${referralReceiver.lastName}`,
            senderId: referral.senderId,
          });

          const customerDefaultDevice = await this.context.deviceMetadata.getDefaultByCustomer(
            referral.senderId
          );
          if (!isNullOrUndefined(customerDefaultDevice)) {
            const analyticsEvent = createCustomerAnalyticsEvent({
              customerId: referral.senderId,
              deviceIdentifierType:
                adjustDeviceTypeIdentifiers[
                  customerDefaultDevice.deviceIdentifierType
                ],
              deviceId: customerDefaultDevice.deviceId,
              eventType: customerAnalyticsEvents.REFERRAL_COMPLETION,
              eventNote: referral.receiverId,
            });
            await sendCustomerAnalyticsEventToQueue(analyticsEvent);
          }

          return true;
        }
      }
    }
    return false;
  }

  async sendReceiverActivationNotification(referralData) {
    if (referralData.amount > 0) {
      const notifications = await this.receiverActivationNotification(
        referralData
      );
      // console.log('notifications', JSON.stringify(notifications, null, 2));
      return this.context.notification.createAllIn(notifications);
    }
  }

  async receiverActivationNotification(referralData) {
    const heading = replacePlaceholders(
      contentTemplates().headings.referralActivated,
      {
        amount: referralData.amount,
        currencyCode: referralData.currencyCode,
        currencyCodeAr: referralData.currencyCodeAr,
        currencyCodeTr: referralData.currencyCodeTr,
      }
    );
    const url = contentTemplates().urls.referralActivated;
    const message = replacePlaceholders(
      contentTemplates().contents.referralActivated,
      {
        receiverName: referralData.receiverName,
      }
    );
    const pushes = [
      {
        customerId: referralData.senderId,
        message,
        heading,
        url,
        notificationCategory: notificationCategories.REFERRAL_ACTIVATED,
      },
    ];
    const result = {
      push: pushes,
      email: [],
    };
    return Promise.resolve(result);
  }
}

module.exports = Referral;
