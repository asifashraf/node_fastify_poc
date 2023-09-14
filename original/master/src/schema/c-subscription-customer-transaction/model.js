/* eslint-disable camelcase */
const BaseModel = require('../../base-model');
const { cSubscriptionActionType, cSubscriptionCustomerTransactionError, cSubscriptionReferenceOrderType } = require('./enum');
const { cSubscriptionCustomerStatus } = require('../c-subscription-customer/enum');
const moment = require('moment');
const { now } = require('../../lib/util');
const { map, find, uniq, flatten } = require('lodash');
const Money = require('../../lib/currency');
const { kinesisEventTypes } = require('../../lib/aws-kinesis-logging');
const sqs = require('../../lib/sqs-base')('cSubscription');
const SlackWebHookManager = require('../slack-webhook-manager/slack-webhook-manager');
const {
  cSubscriptionCustomerAutoRenewalStatus
} = require('../c-subscription-customer-auto-renewal/enum');
const subscriptionWebhookUrl = require('../../../config').cSubscription.slackWebHook;
const subscriptionConfig = require('../../../config').cSubscription;

class CSubscriptionCustomerTransaction extends BaseModel {
  constructor(db, context) {
    super(db, 'subscription_customer_transactions', context);
  }


  async getAllOrderByCreated(subscriptionId, customerId) {
    const query = await this.roDb(this.tableName)
      .where('subscription_id', subscriptionId)
      .andWhere('customer_id', customerId)
      .orderBy('created', 'desc');
    return query;
  }

  /**
   * IMPORTANT: when you are using this query, please make sure
   * that you are getting the latest transaction. Avoid calling from
   * a function using "Promise.all()"
   */
  async getLatest(subscriptionCustomerId) {
    const query = await this.roDb(this.tableName)
      .where('subscription_customer_id', subscriptionCustomerId)
      .orderBy('sequence', 'desc')
      .first();
    return query;
  }

  async getTodayRedemptions(subscriptionCustomerId, todayDate) {
    return this.roDb(this.tableName)
      .sum('credit as credit')
      .sum('debit as debit')
      .where('subscription_customer_id', subscriptionCustomerId)
      .whereIn('action_type', [cSubscriptionActionType.ORDER_PLACED, cSubscriptionActionType.ORDER_REFUNDED])
      .andWhere('created', '>=', todayDate)
      .groupBy(['subscription_id', 'reference_order_id'])
      .havingRaw('sum(credit) <= sum(debit)');
  }

  async getTodayRedemptionSummaryInfo({ subscriptionCustomerId, subscriptionCustomer }) {
    const { id, countryId, subscriptionId, perOrderMaxCupsCount, perDayCupsCount, status }
      = subscriptionCustomer || await this.context.cSubscriptionCustomer.getById(subscriptionCustomerId);
    subscriptionCustomerId = id;
    if (status !== cSubscriptionCustomerStatus.ACTIVE) {
      return {
        subscriptionCustomerId,
        subscriptionId,
        date: null,
        todayRedemptionsExist: null,
        isRedeemedToday: null,
        todayTotalDebit: null,
        todayTotalCredit: null,
        todayRemainingCupsCount: null,
        perDayCupsCount,
        perOrderMaxCupsCount,
        maxSubscribableFromRule: null,
        allRemainingCupsCountByLeftDays: null,
        leftDays: null,
        leftMinutes: null,
      };
      //throw new Error('Wrong Customer Subscription');
    }
    const { remainingCups: latestTrxRemainingCups, created, remainingMinutes } = await this.context.cSubscriptionCustomerTransaction.getLatest(id);
    const timeZoneIdentifier = await this.context.country.getTimezoneIdentifier(countryId);
    const today = moment().tz(timeZoneIdentifier).startOf('day').tz('UTC');
    const finishDate = moment(created).tz(timeZoneIdentifier).add(remainingMinutes, 'minutes');
    const leftDays = finishDate.diff(moment().tz(timeZoneIdentifier), 'days');
    const leftMinutes = finishDate.diff(moment().tz(timeZoneIdentifier), 'minutes');
    const todayRedemptions = await this.getTodayRedemptions(id, today);
    const todayRedemptionsExist = (todayRedemptions && todayRedemptions.length > 0);
    const todayTotalDebit = todayRedemptionsExist ? todayRedemptions.reduce((a, b) => parseInt(a) + parseInt(b.debit), 0) : 0;
    const todayTotalCredit = todayRedemptionsExist ? todayRedemptions.reduce((a, b) => parseInt(a) + parseInt(b.credit), 0) : 0;
    const todayTotalDiff = todayTotalDebit - todayTotalCredit;
    // const remainingCupsWithTrx = (latestTrxRemainingCups < perDayCupsCount ? latestTrxRemainingCups : perDayCupsCount);
    const todayRemainingCupsCount = latestTrxRemainingCups < (perDayCupsCount - todayTotalDiff) ? latestTrxRemainingCups : (perDayCupsCount - todayTotalDiff);
    const isRedeemedToday = todayRemainingCupsCount === 0;
    const todayRemaining = todayRemainingCupsCount;
    const orderMax = perOrderMaxCupsCount;
    const maxSubscribableFromRule = todayRemaining > orderMax ? orderMax : todayRemaining;
    const allRemainingCupsCountByLeftDays = latestTrxRemainingCups > (perDayCupsCount * leftDays) ? (perDayCupsCount * leftDays) : latestTrxRemainingCups;
    if (todayRemainingCupsCount < 0 || latestTrxRemainingCups < 0) {
      SlackWebHookManager.sendTextAndObjectToSlack('[ERROR] Negative remaining cups detected', { subscriptionCustomerId, subscriptionId }, subscriptionWebhookUrl);
    }
    return {
      subscriptionCustomerId,
      subscriptionId,
      date: today,
      todayRedemptionsExist,
      isRedeemedToday,
      todayTotalDebit,
      todayTotalCredit,
      todayRemainingCupsCount,
      perDayCupsCount,
      perOrderMaxCupsCount,
      maxSubscribableFromRule,
      allRemainingCupsCountByLeftDays,
      leftDays,
      leftMinutes,
    };
  }

  async getPastOrders(subscriptionId, customerId, count) {
    const query = await this.roDb(this.tableName)
      .where('subscription_id', subscriptionId)
      .andWhere('customer_id', customerId)
      .andWhere('action_type', cSubscriptionActionType.ORDER_PLACED)
      .orderBy('created', 'desc')
      .limit(count);
    return query;
  }

  async validateCustomerSubscriptionDetail(customerId, subscriptionId) {
    const errors = [];

    // check subscription validation
    /**
     * Subcription status check removed
     * If the customer has already purchased a subscription,
     * BE cannot block the subscription order
     * until there are no remaining subscription orders.
     * Also, the same case applies to the country configuration.
     * */
    const subscription = await this.context.cSubscription.getById(subscriptionId);
    // if (!subscription || subscription.status != cSubscriptionStatus.ACTIVE) {
    if (!subscription) {
      errors.push(cSubscriptionCustomerTransactionError.INVALID_SUBSCRIPTION);
    } else {
      // check subscription is available in country
      /* const subsAvailable = await this.context.countryConfiguration.getByKey(countryConfigurationKeys.SUBSCRIPTION_ENABLE, subscription.countryId);
      if (!subsAvailable || subsAvailable.configurationValue === 'false') {
        errors.push(cSubscriptionCustomerTransactionError.INVALID_SUBSCRIPTION);
      } else { */
      // check customer validations
      const subs = await this.context.cSubscriptionCustomer.getByCustomerIdAndSubscriptionId(customerId, subscriptionId);
      // is  subscrition exists and active?
      if (!subs || subs.status != cSubscriptionCustomerStatus.ACTIVE) {
        errors.push(cSubscriptionCustomerTransactionError.INVALID_SUBSCRIPTION);
      } else {
        // if there is any inconsistency in data, to get that.
        // if the last transaction has 0 for remaning cups count or remaning period then it shouldn't be available
        const lastTransaction = await this.getLatest(subs.id);
        if (lastTransaction.remainingMinutes == 0 || lastTransaction.remaningCups == 0) {
          errors.push(cSubscriptionCustomerTransactionError.INVALID_SUBSCRIPTION);
        } else {
          const { isRedeemedToday } = await this.getTodayRedemptionSummaryInfo({ subscriptionCustomer: subs });
          if (isRedeemedToday) {
            errors.push(cSubscriptionCustomerTransactionError.PER_DAY_LIMIT_EXCEED);
          }
        }
      }
      // }
    }
    await this.context.kinesisLogger.sendLogEvent(
      { customerId, subscriptionId, errors },
      kinesisEventTypes.subscriptionUsageError
    );
    return errors;
  }

  async findSubscribableMenuItemsWithOptionsByMultipleSubscription(subscriptionIds, items, customerId, currency, maxSubscribableItemCount) {
    let subscribableMenuItems = [];
    let subscribableMenuItemsCount = 0;
    const subscribableInfo = await Promise.all(map(subscriptionIds, async subscriptionId => await this.findSubscribableMenuItemsWithOptions(subscriptionId, items, customerId, currency, maxSubscribableItemCount)));
    subscribableMenuItems = map(subscribableInfo, subs => subs.subscribableMenuItems);
    subscribableMenuItemsCount = subscribableInfo.map(subs => subs.subscribableMenuItemsCount).reduce((acc, amount) => acc + amount);
    return { subscribableMenuItems: flatten(subscribableMenuItems), subscribableMenuItemsCount };
  }

  async findSubscribableMenuItemsWithOptions(subscriptionId, items, customerId, currency, maxSubscribableItemCount) {
    items.sort((a, b) => a.price.intValue - b.price.intValue);
    const subscriptionCustomer = await this.context.cSubscriptionCustomer.getByCustomerIdAndSubscriptionId(customerId, subscriptionId);
    const menuItemsSubscription = await this.context.cSubscriptionMenuItem.getMenuItemsBySubscriptionId(subscriptionId);
    const menuItemOptionsSubscription = await this.context.cSubscriptionMenuItemOption.getMenuItemOptionsBySubscriptionId(subscriptionId);
    map(menuItemsSubscription, menuItem => {
      const options = [];
      for (const option of menuItemOptionsSubscription) {
        if (option.subscriptionMenuItemId == menuItem.id) {
          options.push(option);
        }
      }
      menuItem.options = options;
    });
    const todayRedemptionSummaryInfo = await this.getTodayRedemptionSummaryInfo({ subscriptionCustomer });
    const maxSubscribableFromRule = todayRedemptionSummaryInfo.maxSubscribableFromRule;
    const maxSubscribable = maxSubscribableFromRule > maxSubscribableItemCount ? maxSubscribableItemCount : maxSubscribableFromRule;
    const subscribableMenuItems = [];
    let subscribableMenuItemsCount = 0;
    const _checkMenuItemOptionId = (subsItem, item) => {
      const subsMenuItemOptionId = uniq(subsItem.options.map(opt => opt.menuItemOptionId));
      const itemOptionId = uniq(item.selectedOptions.map(opt => opt.optionId));
      //return subsMenuItemOptionId.length === itemOptionId.length && subsMenuItemOptionId.isEqual(itemOptionId);
      return !!subsMenuItemOptionId.find(optId => itemOptionId.includes(optId));
    };

    items.forEach(item => {
      const subs = find(menuItemsSubscription, menuItem => menuItem.menuItemId == item.itemId);

      if (subs && subscribableMenuItemsCount < maxSubscribable && _checkMenuItemOptionId(subs, item)) {
        item.priceAfterSubscription = item.price;
        item.priceSubscription = new Money(
          0,
          currency.decimalPlace,
          currency.lowestDenomination
        );
        if (item.quantity <= (maxSubscribable - subscribableMenuItemsCount)) {
          item.quantitySubscribable = item.quantity;
          item.subscriptionId = subscriptionId;
          subscribableMenuItemsCount += item.quantity;
        } else {
          item.quantitySubscribable = maxSubscribable - subscribableMenuItemsCount;
          item.subscriptionId = subscriptionId;
          subscribableMenuItemsCount += maxSubscribable - subscribableMenuItemsCount;
        }

        item.selectedOptions.forEach(option => {
          const subscribableOption = find(subs.options, subOption => subOption.menuItemOptionId == option.optionId);
          if (subscribableOption) {
            const optionPrice = new Money(
              option.price,
              currency.decimalPlace,
              currency.lowestDenomination
            );
            item.priceAfterSubscription = item.priceAfterSubscription.sub(optionPrice);
            item.priceSubscription = item.priceSubscription.add(optionPrice);
          }
        });
        subscribableMenuItems.push(item);
      }
    });
    return { subscribableMenuItems, subscribableMenuItemsCount };
  }

  async isSubscriptionUsable(customerId, brandId) {
    const retVal = {};
    retVal.usable = false;
    retVal.subscriptionIds = [];
    const activeSubs = await this.context.cSubscriptionCustomer.getAllActiveSubscriptionsByBrandId(customerId, brandId);
    if (!activeSubs) {
      return { ...retVal };
    }
    const subsInfo = await Promise.all(map(activeSubs, async subs => {
      return { subscriptionId: subs.subscriptionId, errors: await this.validateCustomerSubscriptionDetail(customerId, subs.subscriptionId) };
    }));
    for (const subs of subsInfo) {
      if (subs.errors && subs.errors.length == 0) {
        retVal.usable = true;
        retVal.subscriptionIds.push(subs.subscriptionId);
      }
    }
    return { ...retVal };
  }

  async debitSubscription(
    subscriptionDetails,
    customerId,
    orderSetId,
    currencyId,
    countryId,
    branchId,
    brandId
  ) {
    if (!Array.isArray(subscriptionDetails)) {
      subscriptionDetails = [subscriptionDetails];
    }
    /**
     * for loop is very important to keep transaction sequence in order.
     * do not change! if you don't know what you are doing.
     */
    for (const subscriptionDetail of subscriptionDetails) {
      await this.debit(
        subscriptionDetail.usedCupsCount,
        customerId,
        subscriptionDetail.id,
        orderSetId,
        currencyId,
        countryId,
        branchId,
        brandId,
      );
    }
  }

  /**
   * Important Do not use this function directly from outside this class!
   */
  async debit(subscribableItemsCount, customerId, subscriptionId, orderSetId, currencyId, countryId, branchId, brandId) {
    const subscriptionCustomer = await this.context.cSubscriptionCustomer.getByCustomerIdAndSubscriptionId(customerId, subscriptionId);
    const lastTransaction = await this.getLatest(subscriptionCustomer.id);
    const expiryDate = moment(subscriptionCustomer.created)
      .add(subscriptionCustomer.periodInMinutes, 'minutes');
    const currentTime = moment(now.get());
    const duration = moment.duration(expiryDate.diff(currentTime));
    let minutes = duration.asMinutes();
    minutes = parseInt(minutes);
    const subscriptionCustomerTransaction = {
      subscriptionCustomerId: subscriptionCustomer.id,
      actionType: cSubscriptionActionType.ORDER_PLACED,
      remainingCups: lastTransaction.remainingCups - subscribableItemsCount,
      remainingMinutes: minutes,
      credit: 0,
      debit: subscribableItemsCount,
      referenceOrderType: cSubscriptionReferenceOrderType.ORDER_SET,
      referenceOrderId: orderSetId,
      subscriptionId,
      customerId,
      currencyId,
      countryId,
      brandId,
      branchId,
    };
    await this.save(subscriptionCustomerTransaction);
    await this.createSlackMessage({ countryId, customerId, subscriptionId, orderSetId, remainingCups: subscriptionCustomerTransaction.remainingCups, duration, brandId });
    await this.sendItToSqs('checkInconsistentData', { data: { customerId, subscriptionId }, controlProvider: 'SUBSCRIPTION' });
    if (
      subscriptionCustomerTransaction.remainingCups < 0
    ) {
      SlackWebHookManager.sendTextAndObjectToSlack(
        '[ERROR] Negative remaining cups detected',
        { subscriptionCustomerId: subscriptionCustomer.id, subscriptionId },
        subscriptionWebhookUrl
      );
    }
  }

  async creditSubscription(
    {
      subscribableItemsCount, customerId, subscriptionId, orderSetId,
      currencyId, countryId, branchId, brandId, subscriptionCustomerId
    }
  ) {
    const startedTransaction = await this.getStartedTransactionBySubscriptionCustomerId(subscriptionCustomerId);
    const lastTransaction = await this.getLatest(subscriptionCustomerId);
    const expiryDate = moment(startedTransaction.created)
      .add(startedTransaction.remainingMinutes, 'minutes');
    const currentTime = moment(now.get());
    const duration = moment.duration(expiryDate.diff(currentTime));
    let minutes = duration.asMinutes();
    minutes = parseInt(minutes);

    const subscriptionCustomerTransaction = {
      subscriptionCustomerId,
      actionType: cSubscriptionActionType.ORDER_REFUNDED,
      remainingCups: lastTransaction.remainingCups + subscribableItemsCount,
      remainingMinutes: minutes,
      credit: subscribableItemsCount,
      debit: 0,
      referenceOrderType: cSubscriptionReferenceOrderType.ORDER_SET,
      referenceOrderId: orderSetId,
      subscriptionId,
      customerId,
      currencyId,
      countryId,
      brandId,
      branchId,
    };
    await this.save(subscriptionCustomerTransaction);
    await this.sendItToSqs('checkInconsistentData', { data: { customerId, subscriptionId }, controlProvider: 'SUBSCRIPTION' });
    this.context.cSubscriptionCustomer
      .getById(subscriptionCustomerId)
      .then(({ totalCupsCount }) => {
        if (
          subscriptionCustomerTransaction.remainingCups > totalCupsCount
        ) {
          SlackWebHookManager.sendTextAndObjectToSlack(
            '[ERROR] Remaining cups more than initial cups',
            { subscriptionCustomerId, subscriptionId },
            subscriptionWebhookUrl
          );
        }
      });
  }

  async getAllSubscriptionTransactions(subscriptionCustomerId) {
    const query = this.roDb(this.tableName)
      .where('subscription_customer_id', subscriptionCustomerId)
      .orderBy('created', 'desc');
    return await query;
  }

  async getUsedCupNumbers(subscriptionCustomerIds) {
    return this.roDb(this.tableName)
      .select(this.db.raw('subscription_customer_id, count(id)'))
      .where('action_type', cSubscriptionActionType.ORDER_PLACED)
      .whereIn('subscription_customer_id', subscriptionCustomerIds)
      .groupBy('subscription_customer_id');
  }

  async getOrdersBySubscriptionCustomerId(subscriptionCustomerId) {
    const query = await this.roDb(this.tableName)
      .where('subscription_customer_id', subscriptionCustomerId)
      .andWhere('action_type', cSubscriptionActionType.ORDER_PLACED);
    return query;
  }

  async refundOrderSubscriptionUsage(referenceOrderId) {
    const transactions = await this.roDb(this.tableName)
      .where({
        referenceOrderId,
        actionType: cSubscriptionActionType.ORDER_PLACED,
      });
    /**
     * for loop is very important to keep transaction sequence in order.
     * do not change! if you don't know what you are doing.
     */
    for (const transaction of transactions) {
      await this.creditSubscription({
        subscribableItemsCount: transaction.debit,
        customerId: transaction.customerId,
        subscriptionId: transaction.subscriptionId,
        orderSetId: transaction.referenceOrderId,
        currencyId: transaction.currencyId,
        countryId: transaction.countryId,
        branchId: transaction.branchId,
        brandId: transaction.brandId,
        subscriptionCustomerId: transaction.subscriptionCustomerId,
      });
    }
  }

  async finishSubscriptionIfNoUsageRemaining(
    { customerId, subscriptionId, ignoreAutoRenewal = false }
  ) {
    const subscriptionCustomer = await this.context.cSubscriptionCustomer
      .getByCustomerIdAndSubscriptionId(customerId, subscriptionId);
    const lastTransaction = await this.getLatest(subscriptionCustomer.id);

    const autoRenewal = await this.context.cSubscriptionCustomerAutoRenewal
      .getById(subscriptionCustomer.subscriptionCustomerAutoRenewalId);
    if (
      lastTransaction.remainingCups === 0
      && (
        autoRenewal.status !== cSubscriptionCustomerAutoRenewalStatus.ACTIVE
        || ignoreAutoRenewal
      )
    ) {
      // IMPORTANT: finishing process shouldn't affect current order
      sqs.sendMessage({
        finishType: 'RUN_OUT_USAGE',
        subscriptionCustomerId: subscriptionCustomer.id
      }).catch(error => {
        this.context.kinesisLogger.sendLogEvent(
          {
            subscriptionCustomerId: subscriptionCustomer.id,
            subscriptionCustomerTransaction: lastTransaction,
            error: error?.message || error,
            description: 'run out customer usage but got an error while creating sqs message'
          },
          kinesisEventTypes.finishCustomerSubscriptionError
        );
      });
    }
  }

  async getStartedTransactionBySubscriptionCustomerId(subscriptionCustomerId) {
    const query = await this.roDb(this.tableName)
      .where('subscription_customer_id', subscriptionCustomerId)
      .andWhere('action_type', cSubscriptionActionType.STARTED)
      .first();
    return query;
  }

  async createSlackMessage({ countryId, customerId, subscriptionId, orderSetId, remainingCups, duration, brandId }) {
    const [brand, customer, country, subscription] = await Promise.all([this.context.brand.getById(brandId), this.context.customer.getById(customerId), this.context.country.getById(countryId), this.context.cSubscription.getById(subscriptionId)]);
    const slackUrl = subscriptionConfig.countryUrls[country.isoCode];
    this.alertIt({
      text: `Subscription Used
Customer: ${customer.firstName + ' ' + customer.lastName}
Brand: ${brand.name}
Subscription: ${subscription.name.en}
Order: ${orderSetId}
Remaining Cups Count: ${remainingCups}
Remaning Days: ${duration.asDays()}`, object: null, image: null, path: slackUrl
    });
  }

  async getSecondLatest(subscriptionCustomerId) {
    const query = await this.roDb(this.tableName)
      .where('subscription_customer_id', subscriptionCustomerId)
      .orderBy('sequence', 'desc')
      .limit(2);
    if (query.length == 1 && query[0].actionType == cSubscriptionActionType.STARTED) {
      /*
      subscription just started so return this record
      */
      return query[0];
    } else {
      if (query[0].actionType == cSubscriptionActionType.FINISHED) {
        /*
        if latest is finished then pick the second record
      */
        return query[1];
      } else {
        /*
        return first because it is not finished
      */
        return query[0];
      }
    }
  }

}

module.exports = CSubscriptionCustomerTransaction;
