const { pick, get, toNumber, first, isNumber } = require('lodash');
const BaseModel = require('../../base-model');

const {
  loyaltyOrderCreateError,
  paymentStatusName,
  paymentStatusOrderType,
  transactionAction,
  transactionType,
  loyaltyBonusTypes,
} = require('../root/enums');
const {
  addPaging,
  formatErrorResponse,
  creditsPaymentMethod,
  formatError,
  toDateWithTZ,
  isNullOrUndefined
} = require('../../lib/util');
const { renderConfirmationEmail } = require('./email-confirmation-renderer');
const {
  notifications: {
    emailAddresses: { receipts },
  },
  order: orderConfig,
} = require('../../../config');
const { notificationCategories } = require('../../lib/notifications');
const { kinesisEventTypes } = require('../../lib/aws-kinesis-logging');
const CreditOrderReportFormatter = require('./credit-order-report-formatter');
const moment = require('moment');

class LoyaltyOrder extends BaseModel {
  constructor(db, context) {
    super(db, 'loyalty_orders', context);
  }

  async getById(id) {
    const result = await super.getById(id);
    return creditsPaymentMethod(result);
  }

  async getAll(filters = {}, paging = {}) {
    let query = super.getAll();
    query.select('loyalty_orders.*');
    query.leftJoin('currencies', 'currencies.id', 'loyalty_orders.currency_id');
    query.leftJoin('countries', 'countries.currency_id', 'currencies.id');

    query = this.applyFilters(query, filters);
    query = query.orderBy('created_at', 'DESC');

    return addPaging(query, paging);
  }

  async getAllToCSV(stream, sku, startDate, endDate, countryId) {
    let query = this.roDb(this.tableName);
    startDate = startDate ? moment(startDate) : undefined;
    endDate = endDate ? moment(endDate) : undefined;
    query = this.applyFilters(query, {
      sku,
      dateRange: { startDate, endDate },
      countryId,
    });
    query = query.orderBy('created_at', 'DESC');

    query.select(
      'loyalty_orders.*',
      'customers.first_name',
      'customers.last_name',
      'customers.email',
      'currencies.name AS currencyName',
      'loyalty_tiers.name AS loyaltyTierName',
      'payment_statuses.name AS paymentStatus',
      'payment_statuses.raw_response AS paymentRawResponse'
    );
    query.join('customers', 'customers.id', 'loyalty_orders.customer_id');
    query.leftJoin(
      'loyalty_tiers',
      'loyalty_tiers.id',
      'loyalty_orders.loyalty_tier_id'
    );
    // join payment status
    // join to find current status
    query.joinRaw(`
          INNER JOIN payment_statuses ON payment_statuses.id = (
            SELECT id FROM payment_statuses
            WHERE payment_statuses.reference_order_id = loyalty_orders.id
            ORDER BY payment_statuses.created_at DESC LIMIT 1
        )
      `);

    query.leftJoin('currencies', 'currencies.id', 'loyalty_orders.currency_id');
    query.leftJoin('countries', 'countries.currency_id', 'currencies.id');

    // console.log('query', query.toString());
    return query
      .stream(s => s.pipe(new CreditOrderReportFormatter()).pipe(stream))
      .catch(console.error);
  }

  applyFilters(query, { sku, dateRange, countryId }) {
    if (sku) {
      query.whereRaw(`lower(loyalty_orders.sku) LIKE '%${sku.toLowerCase()}%'`);
    }
    if (countryId) {
      query.where('countries.id', countryId);
    }
    if (dateRange) {
      const startDate = get(dateRange, 'startDate');
      const endDate = get(dateRange, 'endDate');

      if (startDate) {
        query.where(
          'loyalty_orders.created_at',
          '>=',
          toDateWithTZ(startDate, 'start')
        );
      }

      if (endDate) {
        query.where(
          'loyalty_orders.created_at',
          '<=',
          toDateWithTZ(endDate, 'end')
        );
      }
    }
    return query;
  }

  getByCustomer(customerId, paging) {
    const query = this.db(this.tableName)
      .where('customer_id', customerId)
      .orderBy('created_at', 'desc');

    return addPaging(query, paging);
  }

  getAmountFromLoyaltyOrder(input) {
    const topUpAmount = get(input, 'topUpAmount');
    if (input.loyaltyTier.customAmount) {
      return topUpAmount;
    }
    return input.loyaltyTier.amount;
  }

  formatBonusEntry(amount, bonusEntry) {
    return {
      bonusType: bonusEntry.type,
      bonusValue: parseFloat(bonusEntry.value),
      // Bonus value can either be percent or fixed
      bonus:
        bonusEntry.type.toLocaleLowerCase() ===
        loyaltyBonusTypes.PERCENT.toLocaleLowerCase()
          ? (amount * bonusEntry.value) / 100
          : parseFloat(bonusEntry.value),
    };
  }

  calculateTopupBonusDetails(amount, loyaltyTier) {
    let bonus;
    if (loyaltyTier.customAmount) {
      bonus = 0;
      if (loyaltyTier.loyaltyBonuses && loyaltyTier.loyaltyBonuses.length > 0) {
        // Set bonus details
        for (const loyaltyBonus of loyaltyTier.loyaltyBonuses) {
          if (
            loyaltyBonus.lowerBound <= amount &&
            (isNullOrUndefined(loyaltyBonus.upperBound) || amount <= loyaltyBonus.upperBound)
          ) {
            return this.formatBonusEntry(amount, loyaltyBonus);
          }
        }
      }
    } else {
      bonus = loyaltyTier.bonus || 0;
      // For non-custom values, there can only be one bonus defined
      if (loyaltyTier.loyaltyBonuses && loyaltyTier.loyaltyBonuses.length > 0) {
        const bonusEntry = first(loyaltyTier.loyaltyBonuses);
        if (bonusEntry !== undefined) {
          return this.formatBonusEntry(amount, bonusEntry);
        }
      }
    }
    // If this returns, it returns bonus as 0 and other two fields as undefined
    return { bonus: isNumber(bonus) ? bonus : 0 };
  }

  async create(input) {
    if (input.loyaltyTierId) {
      input.loyaltyTier = await this.context.loyaltyTier.getById(
        input.loyaltyTierId
      );
    } else {
      const orderSku = get(input, 'sku');
      input.loyaltyTier = await this.context.loyaltyTier.getBySku(orderSku);
    }
    if (input.loyaltyTier) {
      input.loyaltyTierId = input.loyaltyTier.id;
      input.loyaltyTier.loyaltyBonuses = await this.context.loyaltyBonus.getByLoyaltyTierId(
        input.loyaltyTierId
      );
    }

    // CurrencyId is defined as nullable, if no currencyId is given, default to KWD
    if (!input.currencyId && input.loyaltyTier) {
      if (input.loyaltyTier) {
        input.currencyId = input.loyaltyTier.currencyId;
      } else {
        // default currency to KD
        const currency = await this.context.currency.getByCode();
        input.currencyId = currency.id;
      }
    }

    // Validate Order
    const validationErrors = await this.validate(input);

    if (validationErrors.length > 0) {
      return formatErrorResponse(validationErrors);
    }

    // Start off by creating an Loyalty Order
    const loyaltyOrder = pick(input, [
      'customerId',
      'sku',
      'loyaltyTierId',
      'currencyId',
    ]);

    const customer = await this.context.customer.getById(
      loyaltyOrder.customerId
    );
    const currency = await this.context.currency.getById(
      input.loyaltyTier.currencyId
    );
    const country = await this.context.country.getById(
      input.loyaltyTier.countryId
    );

    loyaltyOrder.amount = toNumber(this.getAmountFromLoyaltyOrder(input));

    const bonusDetails = this.calculateTopupBonusDetails(
      loyaltyOrder.amount,
      input.loyaltyTier
    );

    loyaltyOrder.bonus = toNumber(isNumber(bonusDetails?.bonus) ? bonusDetails?.bonus : 0);
    loyaltyOrder.bonusType = bonusDetails.bonusType;
    loyaltyOrder.bonusValue = toNumber(bonusDetails.bonusValue || 0);

    const {
      paymentProvider,
      customerCardToken,
    } = await this.context.paymentService.detectPaymentProviderViaPaymentMethod(
      input.paymentMethod
    );
    if (customerCardToken) {
      delete customerCardToken.providerRaw;
    }

    loyaltyOrder.paymentProvider = paymentProvider;
    loyaltyOrder.paymentMethod = input.paymentMethod.paymentScheme;
    loyaltyOrder.receiptUrl = orderConfig.receiptUrl;
    loyaltyOrder.errorUrl = orderConfig.errorUrl;

    // Create Order Set
    const loyaltyOrderId = await this.save(loyaltyOrder);
    // Save Order payment method
    const orderPaymentMethodInput = {
      orderType: paymentStatusOrderType.LOYALTY_ORDER,
      referenceOrderId: loyaltyOrderId,
      paymentProvider,
      paymentMethod: input.paymentMethod || {},
      customerCardTokenSnapshot: customerCardToken,
    };
    await this.context.orderPaymentMethod.save(orderPaymentMethodInput);
    let paymentStatus = paymentStatusName.PAYMENT_PENDING;
    let paymentRawResponse = {};
    let paymentUrl = null;
    let psResponse;
    if (loyaltyOrder.amount > 0) {
      psResponse = await this.context.paymentService.pay({
        language: customer.preferedLanguage,
        currencyCode: currency.isoCode,
        countryCode: country.isoCode,
        countryId: country.id,
        amount: loyaltyOrder.amount,
        paymentMethod: input.paymentMethod,
        referenceOrderId: loyaltyOrderId,
        orderType: paymentStatusOrderType.LOYALTY_ORDER,
        customerId: customer.id,
        customerPhoneNumber: customer.phoneNumber,
      });

      if (psResponse.error) {
        paymentStatus = paymentStatusName.PAYMENT_FAILURE;

        await this.context.paymentStatus.save({
          referenceOrderId: loyaltyOrderId,
          orderType: paymentStatusOrderType.LOYALTY_ORDER,
          name: paymentStatus,
          rawResponse: psResponse.error,
        });

        await this.context.kinesisLogger.sendLogEvent(
          {
            loyaltyPaymentResponseError: psResponse,
            loyaltyOrderInput: input,
            customer,
            currencyIso: currency.isoCode,
            countryIso: country.isoCode,
            loyaltyOrder,
          },
          kinesisEventTypes.loyaltyOrderCreateError
        );

        return {
          error: [loyaltyOrderCreateError.MERCHANT_INITIALIZATION_ERROR],
        };
      }
      await this.context.loyaltyOrder.save({
        id: loyaltyOrderId,
        merchantId: psResponse.id,
      });
      paymentUrl = psResponse.paymentUrl;
      paymentRawResponse = psResponse.rawResponse;
      if (psResponse.approved) {
        paymentStatus = paymentStatusName.PAYMENT_SUCCESS;
        const credit =
          toNumber(loyaltyOrder.amount) + toNumber(loyaltyOrder.bonus);
        await this.context.loyaltyTransaction.credit(
          loyaltyOrderId,
          paymentStatusOrderType.LOYALTY_ORDER,
          loyaltyOrder.customerId,
          credit,
          loyaltyOrder.currencyId
        );
      }
    } else {
      paymentStatus = paymentStatusName.PAYMENT_SUCCESS;
    }

    // Insert Initial Payment Status
    await this.context.paymentStatus.save({
      referenceOrderId: loyaltyOrderId,
      orderType: paymentStatusOrderType.LOYALTY_ORDER,
      name: paymentStatus,
      rawResponse: paymentRawResponse,
    });

    let transactionModel;
    // add payment transaction
    if (paymentStatus === paymentStatusName.PAYMENT_SUCCESS) {
      transactionModel = {
        referenceOrderId: loyaltyOrderId,
        orderType: paymentStatusOrderType.LOYALTY_ORDER,
        action: transactionAction.COFE_CREDIT,
        type: transactionType.CREDITED,
        customerId: loyaltyOrder.customerId,
        amount: loyaltyOrder.amount,
      };
      transactionModel.currencyId = loyaltyOrder.currencyId;
      await this.context.transaction.save(transactionModel);
    }

    await this.context.kinesisLogger.sendLogEvent(
      {
        loyaltyPaymentResponse: psResponse,
        loyaltyOrderInput: input,
        customer,
        currencyIso: currency.isoCode,
        countryIso: country.isoCode,
        transactionModel,
        loyaltyOrder,
      },
      kinesisEventTypes.loyaltyOrderCreateSuccess
    );

    return {
      paymentUrl,
      loyaltyOrderId,
      paymentStatus,
    };
  }

  // Validations
  async validate(loyaltyOrder) {
    const errors = [];

    const topUpAmount = get(loyaltyOrder, 'topUpAmount', 0);

    if (!loyaltyOrder.loyaltyTier) {
      errors.push(loyaltyOrderCreateError.INVALID_SKU);
      return errors;
    }

    if (loyaltyOrder.loyaltyTier.customAmount && topUpAmount <= 0) {
      errors.push(loyaltyOrderCreateError.INVALID_TOPUP_AMMOUNT);
    }

    const isValidCustomer = await this.context.customer.isValid({
      id: loyaltyOrder.customerId,
    });

    if (!isValidCustomer) {
      errors.push(loyaltyOrderCreateError.INVALID_CUSTOMER);
    }

    if (
      !loyaltyOrder.paymentMethod ||
      !loyaltyOrder.paymentMethod.paymentScheme
    ) {
      errors.push(loyaltyOrderCreateError.INVALID_PAYMENT_METHOD);
    }

    return errors;
  }

  /**
   Determines the appropriate notifications that must be sent in response to a payment status change. Broken out into a separate function for testability.
   @param {String} orderSetId The associated order set id.
   @param {String} paymentStatusName The payment status name, e.g. "PAYMENT_SUCCESS"
   @param {Object} knetResponse The response from KNET payment gateway
   @param {Object} context The current query-context
   @return {Object} An object with three arrays: push, sms, and email. Each array contains objects that can be passed to the pushCreate, smsCreate, and emailCreate functions in notifications.js
   Developers should not use this function directly, but rather the associated function called `sendPaymentStatusChangeNotifications()`.
   */
  async paymentStatusChangeNotifications(
    loyaltyOrderId,
    paymentStatusName,
    knetResponse,
    context
  ) {
    const emptySet = { push: [], sms: [], email: [] };
    if (paymentStatusName !== 'PAYMENT_SUCCESS') {
      return Promise.resolve(emptySet);
    }

    try {
      const rendering = await renderConfirmationEmail(
        context,
        loyaltyOrderId,
        paymentStatusName,
        knetResponse
      );
      if (!rendering) {
        return Promise.resolve(emptySet);
      }
      const emailArgs = Object.assign(
        {
          sender: receipts,
          notificationCategory: notificationCategories.ORDER_CONFIRMATION,
        },
        rendering
      );
      const result = {
        push: [],
        sms: [],
        email: [emailArgs],
      };

      return Promise.resolve(result);
    } catch (err) {
      await context.kinesisLogger.sendLogEvent(
        {
          error: err,
        },
        kinesisEventTypes.loyaltyOrderNotificationFailed
      );
      return Promise.resolve(emptySet);
    }
  }

  /**
   Sends customer notifications indicated by the payment status change.
   */
  async sendPaymentStatusChangeNotifications(
    loyaltyOrderId,
    paymentStatusName,
    knetResponse
  ) {
    // console.log('[sendPaymentStatusChangeNotifications]');
    const notifications = await this.paymentStatusChangeNotifications(
      loyaltyOrderId,
      paymentStatusName,
      knetResponse,
      this.context
    );
    return this.context.notification.createAllIn(notifications);
  }

  // async getAvailablePaymentMethods({
  //   total: amount,
  //   currencyCode,
  //   countryCode,
  // }) {
  //   const currency = await this.context.currency.getByCode(currencyCode);
  //   let paymentMethods = [];
  //
  //   const customerId =
  //     this.context.auth && this.context.auth.id ? this.context.auth.id : null;
  //
  //   const providerPaymentMethods = await this.context.paymentService.getPaymentMethods(
  //     {
  //       countryCode,
  //       currencyCode,
  //       customerId,
  //       amount,
  //     }
  //   );
  //
  //   providerPaymentMethods.map(providerPaymentMethod => {
  //     paymentMethods.push({
  //       ...providerPaymentMethod,
  //       currency: addLocalizationField(
  //         addLocalizationField(currency, 'symbol'),
  //         'subunitName'
  //       ),
  //     });
  //     return providerPaymentMethod;
  //   });
  //
  //   paymentMethods = addIconsToPaymentMethods(paymentMethods);
  //   return addLocalizationField(paymentMethods, 'name');
  // }

  async resolvePaymentCallback(psResponse) {
    const { referenceOrderId, paymentStatus, rawResponse } = psResponse;
    const order = await this.getById(referenceOrderId);
    if (!order) {
      return formatError([`credits order ${referenceOrderId} not found`]);
    }
    const [
      currentPaymentStatus,
    ] = await this.context.paymentStatus.getAllByCreditsOrderId(order.id);
    const newPaymentStatus = {
      referenceOrderId,
      orderType: paymentStatusOrderType.LOYALTY_ORDER,
      name: paymentStatus,
      rawResponse: JSON.stringify(rawResponse),
    };
    if (paymentStatus === paymentStatusName.PAYMENT_SUCCESS) {
      if (paymentStatus === currentPaymentStatus.name) {
        console.log(
          `${paymentStatusName.PAYMENT_SUCCESS} already processed for ${order.id}`
        );
      } else {
        // credit only on first time success
        await this.context.paymentStatus.save(newPaymentStatus);
        const credit = toNumber(order.amount) + toNumber(order.bonus);
        await this.context.loyaltyTransaction.credit(
          order.id,
          paymentStatusOrderType.LOYALTY_ORDER,
          order.customerId,
          credit,
          order.currencyId
        );
      }
    } else {
      await this.context.paymentStatus.save(newPaymentStatus);
    }
    return {
      redirect:
        paymentStatus === paymentStatusName.PAYMENT_SUCCESS
          ? order.receiptUrl
          : order.errorUrl,
      trackid: order.id,
      paymentMethod: order.paymentMethod,
    };
  }
}

module.exports = LoyaltyOrder;
