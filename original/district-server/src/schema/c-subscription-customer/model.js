/* eslint-disable camelcase */
const BaseModel = require('../../base-model');
const QueryHelper = require('../../lib/query-helper');
const moment = require('moment');
const {
  toDateWithTZ, addLocalizationField, uuid,
  transformToCamelCase, objTransformToCamelCase
} = require('../../lib/util');
const {
  cSubscriptionCustomerStatus, CSubscriptionStatusInfo
} = require('./enum');
const { get, map, find, reduce } = require('lodash');
const {
  cSubscriptionActionType,
  cSubscriptionReferenceOrderType
} = require('../c-subscription-customer-transaction/enum');
const { kinesisEventTypes } = require('../../lib/aws-kinesis-logging');
const { contentTemplates, replacePlaceholders } = require('../../lib/push-notification');
const { notificationCategories } = require('../../lib/notifications');
const CurrencyValue = require('../../lib/currency');

class CSubscriptionCustomer extends BaseModel {
  constructor(db, context) {
    super(db, 'subscription_customers', context);
  }

  async getByCustomerId(customerId, status = cSubscriptionCustomerStatus.ACTIVE) {
    const query = this.roDb(this.tableName).where('customer_id', customerId).orderBy('created', 'desc');
    if (status) {
      query.andWhere('status', status);
    }
    return query;
  }

  async getByCustomerIdAndSubscriptionId(customerId, subscriptionId) {
    const query = await this.roDb(this.tableName)
      .where('customer_id', customerId)
      .andWhere('subscription_id', subscriptionId)
      .andWhere('status', cSubscriptionCustomerStatus.ACTIVE)
      .orderBy('created', 'desc')
      .first();
    return query;
  }

  async getOverview(subsCust) {
    if (!subsCust) {
      return null;
    }
    const subscriptionId = subsCust.subscriptionId;
    const latestTransaction = await this.context.cSubscriptionCustomerTransaction.getLatest(subsCust.id);
    const secondLastTransaction = await this.context.cSubscriptionCustomerTransaction.getSecondLatest(subsCust.id);
    /*secondLastTransaction is used to handle finished subscription case*/
    if (!secondLastTransaction) {
      return null;
    }
    const isSubscriptionCustomerActive = subsCust.status === cSubscriptionCustomerStatus.ACTIVE;
    const startDate = subsCust.created;
    let expiryDate = moment(latestTransaction.created);
    if (isSubscriptionCustomerActive) {
      expiryDate = expiryDate.add(latestTransaction.actionType === cSubscriptionActionType.FINISHED ? 0 : latestTransaction.remainingMinutes, 'minutes');
    } else {
      const finished = await this.context.db(this.context.cSubscriptionCustomerTransaction.tableName).where({
        'subscription_customer_id': subsCust.id,
        'action_type': cSubscriptionActionType.FINISHED,
      }).orderBy('sequence', 'desc').first();
      if (finished) {
        expiryDate = moment(finished.created);
      } else {
        expiryDate = expiryDate.add(latestTransaction.remainingMinutes, 'minutes');
      }
    }

    const subs = await this.context.cSubscription.getById(subscriptionId);
    if (!subs) {
      return null;
    }
    const todayRedemptionSummaryInfo = await this.context.cSubscriptionCustomerTransaction
      .getTodayRedemptionSummaryInfo({ subscriptionCustomer: subsCust });
    const remainingCups = latestTransaction.remainingCups;
    const remainingCupsBeforeFinished = secondLastTransaction.remainingCups;
    const calculatedTodayRemaining = todayRedemptionSummaryInfo.todayRemainingCupsCount;
    const todayRemaining = calculatedTodayRemaining < remainingCups ? calculatedTodayRemaining : remainingCups;
    const applicableCupsCountPerOrder = todayRemaining < subsCust.perOrderMaxCupsCount ? todayRemaining : subsCust.perOrderMaxCupsCount;
    const retVal = {
      ...subsCust,
      todayRemaining,
      applicableCupsCountPerOrder,
      remainingCups,
      expiryDate,
      subscriptionName: subs.name,
      totalRemainingCupsCountByLeftDays: todayRedemptionSummaryInfo.allRemainingCupsCountByLeftDays,
      remainingDays: todayRedemptionSummaryInfo.leftDays,
      remainingMinutes: todayRedemptionSummaryInfo.leftMinutes,
      subscriptionCustomerId: subsCust.id,
      startDate,
      totalCupsRedeemed: (subsCust.totalCupsCount - remainingCupsBeforeFinished)
    };
    return retVal;
  }

  async getAllActiveSubscriptionsByBrandId(customerId, brandId) {
    const query = await this.roDb(this.tableName)
      .where('customer_id', customerId)
      .andWhere('status', cSubscriptionCustomerStatus.ACTIVE)
      .andWhere('brand_id', brandId)
      .orderBy('created', 'desc');
    if (query) {
      return query;
    }
    return null;
  }

  async getAllInactiveSubscriptions(customerId, countryId) {
    const query = await this.roDb(this.tableName)
      .where('customer_id', customerId)
      .andWhere('status', cSubscriptionCustomerStatus.INACTIVE)
      .andWhere('country_id', countryId)
      .orderBy('created', 'desc');
    if (query) {
      return query;
    }
    return null;
  }

  async getAllActiveSubscriptions(customerId, countryId, status = cSubscriptionCustomerStatus.ACTIVE) {
    const query = await this.roDb(this.tableName)
      .where('customer_id', customerId)
      .andWhere('status', status)
      .andWhere('country_id', countryId)
      .orderBy('created', 'desc');
    if (query) {
      return query;
    }
    return null;
  }

  async getAllSubscriptions(customerId, countryId, subscriptionId) {
    const query = this.roDb(this.tableName)
      .where('customer_id', customerId)
      .andWhere('country_id', countryId)
      .andWhere('status', cSubscriptionCustomerStatus.ACTIVE)
      .orderBy('created', 'desc');
    if (subscriptionId) {
      query.where('subscription_id', subscriptionId);
    }
    return await query;
  }

  getAllActiveSubscriptionsWithBrands(customerId) {
    return this.roDb({ sc: this.tableName })
      .select(this.roDb.raw('sc.*, row_to_json(b.*) brand'))
      .leftJoin({b: 'brands'}, 'b.id', 'sc.brand_id')
      .where('sc.customer_id', customerId)
      .where('sc.status', cSubscriptionCustomerStatus.ACTIVE);
  }
  async getLastActiveSubscriptionId(customerId, countryId) {
    const query = await this.roDb(this.tableName)
      .where('customer_id', customerId)
      .andWhere('status', cSubscriptionCustomerStatus.ACTIVE)
      .andWhere('country_id', countryId)
      .orderBy('created', 'desc')
      .first();
    if (query) {
      return query.subscriptionId;
    }
    return null;
  }

  async getLastActiveSubscription(customerId, countryId) {
    return this.roDb(this.tableName)
      .select('subscriptions.*')
      .where(`${this.tableName}.customer_id`, customerId)
      .join('subscriptions', 'subscriptions.id', `${this.tableName}.subscription_id`)
      .andWhere(`${this.tableName}.status`, cSubscriptionCustomerStatus.ACTIVE)
      .andWhere(`${this.tableName}.country_id`, countryId)
      .orderBy(`${this.tableName}.created`, 'desc')
      .first();
  }

  async getCSubscriptionCustomerOverview(countryId, customerId, status = cSubscriptionCustomerStatus.ACTIVE) {
    const subscriptionInfo = {};
    let InactiveSubs = [];
    subscriptionInfo.subscriptionInfoStatus = CSubscriptionStatusInfo.NO_SUBSCRIPTION;
    subscriptionInfo.subscriptionDetail = [];
    let totalCupsRedeemed = 0;
    if (customerId) {
      const activeSubs = await this.getAllActiveSubscriptions(customerId, countryId, status);
      if (status == cSubscriptionCustomerStatus.ACTIVE) {
        InactiveSubs = await this.getAllActiveSubscriptions(customerId, countryId, cSubscriptionCustomerStatus.INACTIVE);
      } else {
        InactiveSubs = await this.getAllActiveSubscriptions(customerId, countryId, cSubscriptionCustomerStatus.ACTIVE);
      }
      if (activeSubs && activeSubs.length != 0) {
        subscriptionInfo.subscriptionInfoStatus = CSubscriptionStatusInfo.ACTIVE_SUBSCRIPTION;
        if (status == cSubscriptionCustomerStatus.INACTIVE) subscriptionInfo.subscriptionInfoStatus = CSubscriptionStatusInfo.INACTIVE_SUBSCRIPTION;
        for (const subs of activeSubs) {
          const overview = await this.getOverview(subs);
          subscriptionInfo.subscriptionDetail.push(overview);
          totalCupsRedeemed += overview.totalCupsRedeemed;
        }
      }
    }
    const InactiveSubsOverview = await Promise.all(InactiveSubs.map(t => this.getOverview(t)));
    totalCupsRedeemed += InactiveSubsOverview.reduce((a, c) => a + c.totalCupsRedeemed, 0);
    subscriptionInfo.totalCupsRedeemed = totalCupsRedeemed;
    return { subscriptionInfo };
  }

  async getCSubscriptionCustomerListing(countryId, filters, paging) {
    const select = `sc.id, sc.status, sc.customer_id, sc.subscription_id, sc.subscription_order_id, sc.created, sc.period, sc.total_cups_count,
     c.first_name, c.last_name, s.name as subscription_name, s.name_ar as subscription_name_ar, s.name_tr as subscription_name_tr`;
    const query = this.roDb(`${this.tableName} as sc`)
      .leftJoin('subscriptions as s', 's.id', 'sc.subscription_id')
      .leftJoin('customers as c', 'c.id', 'sc.customer_id');

    if (filters?.couponId) {
      query.leftJoin('subscription_orders as so', 'so.id', 'sc.subscription_order_id')
        .where('sc.country_id', countryId);
    }
    query.where('sc.country_id', countryId);

    if (filters?.searchText) {
      filters.searchText = filters.searchText.toLowerCase().trim();
      query.whereRaw(
        '(s.name iLike ? or s.name_ar iLike ? or s.name_tr iLike ? or concat(c.first_name, \' \', c.last_name) iLike ? )'
        , [`%${filters.searchText}%`, `%${filters.searchText}%`, `%${filters.searchText}%`, `%${filters.searchText}%`],
      );
    }

    if (filters?.email) {
      filters.email = filters.email.toLowerCase().trim();
      query.whereRaw('c.email ILIKE ?', [`%${filters.email}%`]);
    }

    if (filters?.phoneNumber) {
      filters.phoneNumber = filters.phoneNumber.toLowerCase().trim();
      query.whereRaw('c.phone_number ILIKE ?', [`%${filters.phoneNumber}%`]);
    }

    if (filters?.dateRange) {
      const dateRange = filters.dateRange;
      const startDate = get(dateRange, 'startDate');
      const endDate = get(dateRange, 'endDate');

      if (startDate) {
        query.where(
          `${this.tableName}.created`,
          '>=',
          toDateWithTZ(startDate, 'start')
        );
      }

      if (endDate) {
        query.where(
          `${this.tableName}.created`,
          '<=',
          toDateWithTZ(endDate, 'end')
        );
      }
    }
    query.select(this.db.raw(select)).orderBy('sc.created', 'desc');
    const resp = await new QueryHelper(query)
      .addPaging(paging)
      .addCounting()
      .resolvePagedQuery();
    let subscriptionOrders = resp.items;
    const subscriptionCustomerIds = map(subscriptionOrders, order => { return order.id; });
    const orderNumbers = await this.context.cSubscriptionCustomerTransaction.getUsedCupNumbers(subscriptionCustomerIds);
    subscriptionOrders = map(subscriptionOrders, order => {
      order.usedCupsNumber = 0;
      const cup = find(orderNumbers, orderNumber => orderNumber.subscriptionCustomerId == order.id);
      if (cup) {
        order.usedCupsNumber = cup.count;
      }
      return order;
    });
    return {
      paging: resp.paging,
      items: addLocalizationField(subscriptionOrders, 'subscriptionName')
    };

    /*
    query.select(this.db.raw(select)).orderBy('sc.created', 'desc');
    let subscriptionOrders = await addPaging(query, paging);
    const subscriptionCustomerIds = map(subscriptionOrders, order => { return order.id; });
    const orderNumbers = await this.context.cSubscriptionCustomerTransaction.getUsedCupNumbers(subscriptionCustomerIds);
    subscriptionOrders = map(subscriptionOrders, order => {
      order.usedCupsNumber = 0;
      const cup = find(orderNumbers, orderNumber => orderNumber.subscriptionCustomerId == order.id);
      if (cup) {
        order.usedCupsNumber = cup.count;
      }
      return order;
    });
    return addLocalizationField(subscriptionOrders, 'subscriptionName');
    */
  }

  async getCSubscriptionCustomerDetail(subscriptionCustomerId) {
    const select = `sc.id, sc.status, sc.customer_id, sc.subscription_id, sc.subscription_order_id, sc.created, sc.period, sc.total_cups_count,
      sc.country_id , c.first_name, c.last_name, s.name as subscription_name, s.name_ar as subscription_name_ar, s.name_tr as subscription_name_tr`;
    const subscriptionCustomer = addLocalizationField(
      await this.roDb(`${this.tableName} as sc`)
        .select(this.db.raw(select))
        .leftJoin('subscriptions as s', 's.id', 'sc.subscription_id')
        .leftJoin('customers as c', 'c.id', 'sc.customer_id')
        .where('sc.id', subscriptionCustomerId)
        .first()
      , 'subscriptionName');
    if (!subscriptionCustomer) {
      return subscriptionCustomer;
    }
    const orders = await this.context.cSubscriptionCustomerTransaction.getOrdersBySubscriptionCustomerId(subscriptionCustomerId);
    const orderIds = map(orders, order => order.referenceOrderId);
    const orderSets = await Promise.all(
      map(
        orderIds,
        id => this.context.orderSet.getById(id)
      )
    );
    subscriptionCustomer.orders = orderSets;
    const previousSubscriptionOrders = await this.roDb(`${this.tableName} as sc`)
      .select(this.db.raw('sc.id, sc.period, sc.created, so.short_code'))
      .leftJoin('subscription_orders as so', 'so.id', 'sc.subscription_order_id')
      .where('sc.customer_id', subscriptionCustomer.customerId)
      .where('sc.country_id', subscriptionCustomer.countryId)
      .where('sc.subscription_id', subscriptionCustomer.subscriptionId)
      .whereNot('sc.id', subscriptionCustomerId)
      .orderBy('created', 'desc');
    subscriptionCustomer.previousSubscriptions = previousSubscriptionOrders;
    subscriptionCustomer.payment = await this.context.cSubscriptionOrder.getById(subscriptionCustomer.subscriptionOrderId);
    return subscriptionCustomer;
  }

  async finishSubscription(subscriptionCustomerId) {
    try {
      const subscriptionCustomer = await this.roDb(this.tableName)
        .where({
          id: subscriptionCustomerId,
          status: cSubscriptionCustomerStatus.ACTIVE
        })
        .first();
      if (!subscriptionCustomer) {
        return {
          status: false,
          error: 'NO_SUBSCRIPTION_FOUND'
        };
      }
      const latestTransaction = await this.context
        .cSubscriptionCustomerTransaction
        .getLatest(subscriptionCustomerId);
      await this.db.transaction(async trx => {
        await trx(this.tableName)
          .where('id', subscriptionCustomerId)
          .update({
            status: cSubscriptionCustomerStatus.INACTIVE
          });
        await trx(this.context.cSubscriptionCustomerTransaction.tableName)
          .insert({
            id: uuid.get(),
            subscriptionCustomerId,
            actionType: cSubscriptionActionType.FINISHED,
            remainingCups: 0,
            remainingMinutes: Number(latestTransaction.remainingCups) === 0
              && Number(latestTransaction.remainingMinutes) > 0
              ? latestTransaction.remainingMinutes
              : 0,
            credit: 0,
            debit: latestTransaction.remainingCups,
            subscriptionId: latestTransaction.subscriptionId,
            customerId: latestTransaction.customerId,
            currencyId: latestTransaction.currencyId,
            countryId: latestTransaction.countryId,
            referenceOrderId: subscriptionCustomer.subscriptionOrderId,
            referenceOrderType: cSubscriptionReferenceOrderType.SUBSCRIPTION_ORDER,
            brandId: subscriptionCustomer.brandId
          });
      });
      this.context.kinesisLogger.sendLogEvent(
        { subscriptionCustomerId },
        kinesisEventTypes.finishCustomerSubscription
      ).catch(err => console.error(err));
      return {
        status: true,
      };
    } catch (error) {
      this.context.kinesisLogger.sendLogEvent(
        { subscriptionCustomerId, error: error?.message || error },
        kinesisEventTypes.finishCustomerSubscriptionError
      ).catch(err => console.error(err));
      return {
        status: false,
        error: 'SERVICE_ERROR'
      };
    }
  }

  async finishReminderNotification(subscriptionCustomer) {
    let message = contentTemplates().contents.subscriptionFinishReminder;
    let heading = contentTemplates().headings.subscriptionFinishReminder;

    const subscription = await this.context.cSubscription.getById(
      subscriptionCustomer.subscriptionId
    );
    const brand = await this.context.brand.getById(
      subscriptionCustomer.brandId
    );
    const country = await this.context.country.getById(
      brand.countryId
    );
    const latestTransaction = await this.context
      .cSubscriptionCustomerTransaction.getLatest(subscriptionCustomer.id);

    const expiryDate = moment(latestTransaction.created).tz(country.timeZoneIdentifier)
      .add(latestTransaction.remainingMinutes, 'minutes');
    const remainingDay = expiryDate.diff(moment(), 'days');
    heading = replacePlaceholders(heading, {
      remainingDay,
    });

    message = replacePlaceholders(message, {
      planName: subscription?.name?.en ?? '',
      planNameAr: subscription?.name?.ar ?? subscription?.name?.en ?? '',
      planNameTr: subscription?.name?.tr ?? subscription?.name?.en ?? '',
      brandName: brand?.name ?? '',
      brandNameAr: brand?.nameAr ?? brand?.name ?? '',
      brandNameTr: brand?.nameTr ?? brand?.name ?? '',
      date: expiryDate.format('DD.MM.YYYY'),
    });

    return {
      push: [
        {
          customerId: subscriptionCustomer.customerId,
          message,
          heading,
          notificationCategory:
            notificationCategories.SUBSCRIPTION_FINISH_REMINDER,
          subscriptionCustomerId: subscriptionCustomer.id,
          subscriptionId: subscriptionCustomer.subscriptionId,
        },
      ],
      email: []
    };
  }

  async lowCupCountsReminderNotification(subscriptionCustomer) {
    const heading = contentTemplates()
      .headings
      .subscriptionLowCupCountsReminder;
    const message = contentTemplates()
      .contents
      .subscriptionLowCupCountsReminder;

    const country = await this.context.country.getById(
      subscriptionCustomer.countryId,
    );

    heading.ar = heading.ar[country.isoCode] || heading.ar.SA;
    message.ar = message.ar[country.isoCode] || message.ar.SA;

    return {
      push: [
        {
          customerId: subscriptionCustomer.customerId,
          message,
          heading,
          notificationCategory:
          notificationCategories.SUBSCRIPTION_LOW_CUP_COUNTS_REMINDER,
          subscriptionCustomerId: subscriptionCustomer.id,
          subscriptionId: subscriptionCustomer.subscriptionId,
        },
      ],
      email: []
    };
  }

  async allCupsConsumedFastReminderNotification(subscriptionCustomer) {
    const heading = contentTemplates()
      .headings
      .subscriptionAllCupsConsumedFastReminder;
    const message = contentTemplates()
      .contents
      .subscriptionAllCupsConsumedFastReminder;

    const country = await this.context.country.getById(
      subscriptionCustomer.countryId,
    );

    heading.ar = heading.ar[country.isoCode] || heading.ar.SA;
    message.ar = message.ar[country.isoCode] || message.ar.SA;

    return {
      push: [
        {
          customerId: subscriptionCustomer.customerId,
          message,
          heading,
          notificationCategory:
          notificationCategories.SUBSCRIPTION_ALL_CUPS_CONSUMED_FAST_REMINDER,
          subscriptionCustomerId: subscriptionCustomer.id,
          subscriptionId: subscriptionCustomer.subscriptionId,
        },
      ],
      email: []
    };
  }

  async allCupsConsumedReminderNotification(subscriptionCustomer) {
    const heading = contentTemplates()
      .headings
      .subscriptionAllCupsConsumedReminder;
    const message = contentTemplates()
      .contents
      .subscriptionAllCupsConsumedReminder;

    const country = await this.context.country.getById(
      subscriptionCustomer.countryId,
    );

    heading.ar = heading.ar[country.isoCode] || heading.ar.SA;
    message.ar = message.ar[country.isoCode] || message.ar.SA;

    return {
      push: [
        {
          customerId: subscriptionCustomer.customerId,
          message,
          heading,
          notificationCategory:
          notificationCategories.SUBSCRIPTION_ALL_CUPS_CONSUMED_REMINDER,
          subscriptionCustomerId: subscriptionCustomer.id,
          subscriptionId: subscriptionCustomer.subscriptionId,
        },
      ],
      email: []
    };
  }

  async expiryDateNearReminderNotification(subscriptionCustomer) {
    let heading = contentTemplates()
      .headings
      .subscriptionExpiryDateNearReminderNotification;
    const message = contentTemplates()
      .contents
      .subscriptionExpiryDateNearReminderNotification;

    const country = await this.context.country.getById(
      subscriptionCustomer.countryId,
    );

    heading.ar = heading.ar[country.isoCode] || heading.ar.SA;
    message.ar = message.ar[country.isoCode] || message.ar.SA;

    const latestTransaction = await this.context
      .cSubscriptionCustomerTransaction.getLatest(subscriptionCustomer.id);

    const expiryDate = moment(latestTransaction.created)
      .tz(country.timeZoneIdentifier)
      .add(latestTransaction.remainingMinutes, 'minutes');

    heading = replacePlaceholders(heading, {
      date: expiryDate.format('DD.MM.YYYY'),
    });

    return {
      push: [
        {
          customerId: subscriptionCustomer.customerId,
          message,
          heading,
          notificationCategory:
          notificationCategories.SUBSCRIPTION_EXPIRY_DATE_NEAR_REMINDER,
          subscriptionCustomerId: subscriptionCustomer.id,
          subscriptionId: subscriptionCustomer.subscriptionId,
        },
      ],
      email: []
    };
  }

  async expiredTodayReminderNotification(subscriptionCustomer) {
    const heading = contentTemplates()
      .headings
      .subscriptionExpiredTodayReminder;
    const message = contentTemplates()
      .contents
      .subscriptionExpiredTodayReminder;

    const country = await this.context.country.getById(
      subscriptionCustomer.countryId,
    );

    heading.ar = heading.ar[country.isoCode] || heading.ar.SA;
    message.ar = message.ar[country.isoCode] || message.ar.SA;

    return {
      push: [
        {
          customerId: subscriptionCustomer.customerId,
          message,
          heading,
          notificationCategory:
          notificationCategories.SUBSCRIPTION_EXPIRED_TODAY_REMINDER,
          subscriptionCustomerId: subscriptionCustomer.id,
          subscriptionId: subscriptionCustomer.subscriptionId,
          brandId: subscriptionCustomer.brandId,
        },
      ],
      email: []
    };
  }

  async expired3DaysLaterReminderNotification(subscriptionCustomer) {
    const heading = contentTemplates()
      .headings
      .subscriptionExpired3DaysLaterReminder;
    const message = contentTemplates()
      .contents
      .subscriptionExpired3DaysLaterReminder;

    const country = await this.context.country.getById(
      subscriptionCustomer.countryId,
    );

    heading.ar = heading.ar[country.isoCode] || heading.ar.SA;
    message.ar = message.ar[country.isoCode] || message.ar.SA;

    return {
      push: [
        {
          customerId: subscriptionCustomer.customerId,
          message,
          heading,
          notificationCategory:
          notificationCategories.SUBSCRIPTION_EXPIRED_3_DAYS_LATER_REMINDER,
          subscriptionCustomerId: subscriptionCustomer.id,
          subscriptionId: subscriptionCustomer.subscriptionId,
          brandId: subscriptionCustomer.brandId,
        },
      ],
      email: []
    };
  }

  async expired7DaysLaterReminderNotification(subscriptionCustomer) {
    const heading = contentTemplates()
      .headings
      .subscriptionExpired7DaysLaterReminder;
    const message = contentTemplates()
      .contents
      .subscriptionExpired7DaysLaterReminder;

    const country = await this.context.country.getById(
      subscriptionCustomer.countryId,
    );

    heading.ar = heading.ar[country.isoCode] || heading.ar.SA;
    message.ar = message.ar[country.isoCode] || message.ar.SA;

    return {
      push: [
        {
          customerId: subscriptionCustomer.customerId,
          message,
          heading,
          notificationCategory:
          notificationCategories.SUBSCRIPTION_EXPIRED_7_DAYS_LATER_REMINDER,
          subscriptionCustomerId: subscriptionCustomer.id,
          subscriptionId: subscriptionCustomer.subscriptionId,
          brandId: subscriptionCustomer.brandId,
        },
      ],
      email: []
    };
  }

  async expired15DaysLaterReminderNotification(subscriptionCustomer) {
    const heading = contentTemplates()
      .headings
      .subscriptionExpired15DaysLaterReminder;
    const message = contentTemplates()
      .contents
      .subscriptionExpired15DaysLaterReminder;

    const country = await this.context.country.getById(
      subscriptionCustomer.countryId,
    );

    heading.ar = heading.ar[country.isoCode] || heading.ar.SA;
    message.ar = message.ar[country.isoCode] || message.ar.SA;

    return {
      push: [
        {
          customerId: subscriptionCustomer.customerId,
          message,
          heading,
          notificationCategory:
          notificationCategories.SUBSCRIPTION_EXPIRED_15_DAYS_LATER_REMINDER,
          subscriptionCustomerId: subscriptionCustomer.id,
          subscriptionId: subscriptionCustomer.subscriptionId,
          brandId: subscriptionCustomer.brandId,
        },
      ],
      email: []
    };
  }

  async expired30DaysLaterReminderNotification(subscriptionCustomer) {
    const heading = contentTemplates()
      .headings
      .subscriptionExpired30DaysLaterReminder;
    const message = contentTemplates()
      .contents
      .subscriptionExpired30DaysLaterReminder;

    const country = await this.context.country.getById(
      subscriptionCustomer.countryId,
    );

    heading.ar = heading.ar[country.isoCode] || heading.ar.SA;
    message.ar = message.ar[country.isoCode] || message.ar.SA;

    return {
      push: [
        {
          customerId: subscriptionCustomer.customerId,
          message,
          heading,
          notificationCategory:
          notificationCategories.SUBSCRIPTION_EXPIRED_30_DAYS_LATER_REMINDER,
          subscriptionCustomerId: subscriptionCustomer.id,
          subscriptionId: subscriptionCustomer.subscriptionId,
          brandId: subscriptionCustomer.brandId,
        },
      ],
      email: []
    };
  }

  async subscriptionPurchaseNotification(subscriptionCustomer) {
    let message = contentTemplates().contents.subscriptionPurchase;
    const heading = contentTemplates().headings.subscriptionPurchase;

    const subscription = await this.context.cSubscription.getById(
      subscriptionCustomer.subscriptionId
    );
    const brand = await this.context.brand.getById(
      subscriptionCustomer.brandId
    );
    message = replacePlaceholders(message, {
      planName: subscription.name.en,
      brandName: brand.name,
      brandNameAr: brand.nameAr,
      brandNameTr: brand.name,
    });

    return {
      push: [
        {
          customerId: subscriptionCustomer.customerId,
          message,
          heading,
          notificationCategory: notificationCategories.SUBSCRIPTION_PURCHASE,
          subscriptionCustomerId: subscriptionCustomer.id,
          subscriptionId: subscriptionCustomer.subscriptionId,
        },
      ],
      email: []
    };
  }

  async sendNotification(subscriptionCustomerId, type) {
    try {
      const subscriptionCustomer = await this.roDb(this.tableName)
        .where({
          id: subscriptionCustomerId,
        })
        .first();
      if (!subscriptionCustomer) {
        return {
          status: false,
          error: 'NO_SUBSCRIPTION_FOUND'
        };
      }
      let notifications;
      switch (type) {
        case notificationCategories.SUBSCRIPTION_LOW_CUP_COUNTS_REMINDER:
          notifications = await this.lowCupCountsReminderNotification(
            subscriptionCustomer
          );
          break;
        case notificationCategories.SUBSCRIPTION_ALL_CUPS_CONSUMED_FAST_REMINDER:
          notifications = await this.allCupsConsumedFastReminderNotification(
            subscriptionCustomer
          );
          break;
        case notificationCategories.SUBSCRIPTION_ALL_CUPS_CONSUMED_REMINDER:
          notifications = await this.allCupsConsumedReminderNotification(
            subscriptionCustomer
          );
          break;
        case notificationCategories.SUBSCRIPTION_EXPIRY_DATE_NEAR_REMINDER:
          notifications = await this.expiryDateNearReminderNotification(
            subscriptionCustomer
          );
          break;
        case notificationCategories.SUBSCRIPTION_EXPIRED_TODAY_REMINDER:
          notifications = await this.expiredTodayReminderNotification(
            subscriptionCustomer
          );
          break;
        case notificationCategories.SUBSCRIPTION_EXPIRED_3_DAYS_LATER_REMINDER:
          notifications = await this.expired3DaysLaterReminderNotification(
            subscriptionCustomer
          );
          break;
        case notificationCategories.SUBSCRIPTION_EXPIRED_7_DAYS_LATER_REMINDER:
          notifications = await this.expired7DaysLaterReminderNotification(
            subscriptionCustomer
          );
          break;
        case notificationCategories.SUBSCRIPTION_EXPIRED_15_DAYS_LATER_REMINDER:
          notifications = await this.expired15DaysLaterReminderNotification(
            subscriptionCustomer
          );
          break;
        case notificationCategories.SUBSCRIPTION_EXPIRED_30_DAYS_LATER_REMINDER:
          notifications = await this.expired30DaysLaterReminderNotification(
            subscriptionCustomer
          );
          break;
        case notificationCategories.SUBSCRIPTION_FINISH_REMINDER:
          notifications = await this.finishReminderNotification(
            subscriptionCustomer
          );
          break;
        case notificationCategories.SUBSCRIPTION_PURCHASE:
          notifications = await this.subscriptionPurchaseNotification(
            subscriptionCustomer
          );
          break;
        case notificationCategories.SUBSCRIPTION_AUTO_RENEWAL_REMINDER:
          notifications = await this.context.cSubscriptionCustomerAutoRenewal
            .autoRenewalReminderNotification(
              subscriptionCustomer
            );
          break;
        case notificationCategories.SUBSCRIPTION_AUTO_RENEWAL_PURCHASE_SUCCESS:
          notifications = await this.context.cSubscriptionCustomerAutoRenewal
            .autoRenewalPurchaseSuccessNotification(
              subscriptionCustomer
            );
          break;
        case notificationCategories.SUBSCRIPTION_AUTO_RENEWAL_PURCHASE_FAILURE:
          notifications = await this.context.cSubscriptionCustomerAutoRenewal
            .autoRenewalPurchaseFailureNotification(
              subscriptionCustomer
            );
          break;
        default:
          return {
            status: false,
            message: 'INVALID_NOTIFICATION_TYPE'
          };
      }
      await this.context.notification.createAllIn(notifications);
      return {
        status: true,
      };
    } catch (error) {
      this.context.kinesisLogger.sendLogEvent(
        { subscriptionCustomerId, error: error?.message || error },
        kinesisEventTypes.subscriptionFinishReminderError
      ).catch(err => console.error(err));
      return {
        status: false,
        error: 'SERVICE_ERROR'
      };
    }
  }

  async checkSubscriptionStatusForOrderSet(orderSetId) {
    // !!!IMPORTANT!!!
    // all checks are made assuming
    // 1. every customer has one subscription at one time
    // 2. every subscription has one subscribable item at one time
    const result = {
      doesCustomerHaveSubscription: false,
      subscriptionCustomer: null,
      isSubscriptionUsed: false,
      subscribableItems: [],
      subscriptionUsedItems: [],
      orderDayTransactions: [],
      remainingCups: 0,
      remainingDailyCups: 0,
    };
    const orderSet = await this.context.orderSet.getById(orderSetId);
    if (!orderSet) return result;

    if (orderSet.prePaid?.subscription?.usedCupsCount > 0) {
      result.isSubscriptionUsed = true;
      result.subscriptionUsedItems = orderSet.prePaid.subscription.items;
    }

    // get last transaction record before order placed
    const lastTransaction = await this.roDb(
      this.context.cSubscriptionCustomerTransaction.tableName
    )
      .where('customer_id', orderSet.customerId)
      .where('created', '<=', orderSet.createdAt)
      .orderBy('created', 'desc')
      .first();
    if (!lastTransaction) return result;

    // if order created after endDate it means there is no active
    // subscription when order created;
    const endDate = moment(lastTransaction.created)
      .add(lastTransaction.remainingMinutes, 'minutes');
    if (moment(orderSet.createdAt) > endDate) return result;

    result.subscriptionCustomer = await this.roDb(this.tableName)
      .where('id', lastTransaction.subscriptionCustomerId)
      .first();
    result.doesCustomerHaveSubscription = true;
    result.remainingCups = lastTransaction.remainingCups;

    result.orderDayTransactions = await this.roDb(
      this.context.cSubscriptionCustomerTransaction.tableName
    )
      .where('customer_id', orderSet.customerId)
      .where('created', '<=', orderSet.createdAt)
      .where(
        this.roDb.raw('created::date'),
        this.roDb.raw(
          ':orderDate::timestamp::date',
          { orderDate: orderSet.createdAt }
        )
      );

    result.remainingDailyCups = (
      result.subscriptionCustomer.perDayCupsCount
      - result.orderDayTransactions.reduce((sum, transaction) => {
        return sum + transaction.debit;
      }, 0)
    );

    // check subscription menu items in order set
    const orderItemsWithOptions = await this.roDb.raw(`
      select
          oi.id,
          oi.menu_item_id,
          json_agg(oio.menu_item_option_id) selected_options,
          json_agg(oi.*) -> 0 order_item
      from order_item_options oio
      left join order_items oi on
          oi.id = oio.order_item_id
      where oi.order_set_id = :orderSetId
      group by oi.id, oi.menu_item_id
    `, { orderSetId })
      .then(({ rows }) => transformToCamelCase(rows));

    const subscriptionItemsWithOptions = await this.roDb.raw(`
      select smi.id,
             smi.menu_item_id,
             jsonb_agg(smio.menu_item_option_id) selected_options
      from subscription_menu_item_options smio
             left join subscription_menu_items smi on
        smio.subscription_menu_item_id = smi.id
      where smi.subscription_id = :subscriptionId
      group by smi.id,
               smi.menu_item_id
    `, { subscriptionId: result.subscriptionCustomer.subscriptionId })
      .then(({ rows }) => transformToCamelCase(rows));

    result.subscribableItems = orderItemsWithOptions.reduce(
      (subscribableItems, orderItemWithOptions) => {
        const subscriptionItemWithOptions = subscriptionItemsWithOptions.find(
          subscriptionItemWithOptions =>
            subscriptionItemWithOptions.menuItemId
            === orderItemWithOptions.menuItemId
        );
        if (!subscriptionItemWithOptions) return subscribableItems;
        if (
          orderItemWithOptions.selectedOptions.length
          !== subscriptionItemWithOptions.selectedOptions.length
        ) return subscribableItems;
        if (
          orderItemWithOptions.selectedOptions.every(
            optionId => subscriptionItemWithOptions
              .selectedOptions
              .includes(optionId)
          )
        ) {
          subscribableItems.push(
            objTransformToCamelCase(orderItemWithOptions.orderItem)
          );
        }
        return subscribableItems;
      },
      []
    );

    result.subscriptionUsedItems = result.subscriptionUsedItems.map(item => {
      return result.subscribableItems.find(subscribableItem => (
        subscribableItem.menuItemId === item.id
        && subscribableItem.subscriptionQuantity > 0
      ));
    });

    return result;
  }

  getAllActiveBySubscriptionCustomerAutoRenewalId(
    subscriptionCustomerAutoRenewalId
  ) {
    return this.roDb(this.tableName)
      .where(
        'subscription_customer_auto_renewal_id',
        subscriptionCustomerAutoRenewalId
      )
      .andWhere(
        'status', cSubscriptionCustomerStatus.ACTIVE
      );
  }

  async renewedSubscriptionCount(customerId, subscriptionId) {
    const [{count}] = await this.roDb(this.tableName)
      .count()
      .where('customer_id', customerId)
      .andWhere('subscription_id', subscriptionId);
    /**
     * When customer never buy this subscription package return 0
     * When customer first time buy it return 0
     * When customer multiple time buy this package return return (value -1)
     *  */
    return count > 0 ? count - 1 : count;
  }

  async calculateTotalSavingBySubscriptionId(subscriptionId, remainingCups, currency, country, subscriptionCustomerId) {
    const [subscriptionCustomer, subs] = await Promise.all([
      this.getById(subscriptionCustomerId),
      this.context.cSubscription.getById(subscriptionId),
    ]);
    const totalCupsCount = subscriptionCustomer.totalCupsCount;
    const subsPrice = subs.price;
    const subsCompareAtPrice = subs.compareAtPrice;
    const compareAtPrice = new CurrencyValue(
      subsCompareAtPrice, // TODO: We have no subscriptionCustomer.compareAtPrice, we should add
      currency.decimalPlace,
      currency.lowestDenomination,
    );
    const totalDiff = compareAtPrice.sub(subsPrice);
    const totalSaving = totalDiff.mult(parseInt(totalCupsCount) - parseInt(remainingCups)).div(parseInt(subs.totalCupsCount));
    if (totalSaving.value < 0) {
      return new CurrencyValue(
        0,
        currency.decimalPlace,
        currency.lowestDenomination
      );
    }
    return totalSaving;
  }

  async getAllSubscriptionByCustomerIdAndCountryId(customerId, countryId) {
    return this.roDb(this.tableName)
      .where('customer_id', customerId)
      .andWhere('country_id', countryId)
      .orderBy('created', 'desc');
  }

  async calculateTotalSaving(customerId, countryId) {
    const allSubs = await this.context.cSubscriptionCustomer.getAllSubscriptionByCustomerIdAndCountryId(customerId, countryId);
    const country = await this.context.country.getById(countryId);
    const currency = await this.context.currency.getById(country.currencyId);
    const initialValue = new CurrencyValue(
      0,
      currency.decimalPlace,
      currency.lowestDenomination
    );
    if (allSubs.length > 0) {
      const latestTrx = await Promise.all(map(allSubs, subs => this.context.cSubscriptionCustomerTransaction.getSecondLatest(subs.id)));
      const allUsage = await Promise.all(map(latestTrx, trx => this.context.cSubscriptionCustomer.calculateTotalSavingBySubscriptionId(trx.subscriptionId, trx.remainingCups, currency, country, trx.subscriptionCustomerId)));
      const totalSaving = reduce(allUsage,
        (accumulator, currentValue) => accumulator.add(currentValue),
        initialValue
      );
      return totalSaving;
    } else {
      return initialValue;
    }
  }
}

module.exports = CSubscriptionCustomer;
