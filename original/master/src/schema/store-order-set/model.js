const {
  uniq,
  map,
  flatten,
  find,
  groupBy,
  sortBy,
  maxBy,
  pick,
  get,
  filter,
  sumBy,
  isEmpty,
  upperFirst,
} = require('lodash');

const moment = require('moment');
const {
  validateStoreOrderSetRefund,
  storeOrderSetRefund,
} = require('./utils/refund');
const { statusTypes } = require('../root/enums');
// const { paymentProviders } = require('./../../payment-service/enums');

const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');
const {
  kinesisEventTypes: { storeOrderCreateError, storeOrderCreateSuccess },
} = require('../../lib/aws-kinesis-logging');

const {
  storeOrderSetCreateError,
  invoiceComponentType,
  orderPaymentMethods,
  shippingPolicyProperty,
  comparisionOperator,
  paymentStatusOrderType,
  paymentStatusName,
  transactionType,
  transactionAction,
  storeOrderSetStatusName,
  storeOrderStatusName,
  storeOrderSetSubscriptionEvent,
  storeOrderSubscriptionEvent,
  orderTypes,
} = require('../root/enums');
const { notificationCategories } = require('../../lib/notifications');
const { renderConfirmationEmail } = require('./email-confirmation-renderer');

const Money = require('../../lib/currency');
const { paymentSchemes } = require('../../payment-service/enums');
const {
  notifications: {
    emailAddresses: { receipts },
  },
  order: orderConfig, invoice,
} = require('../../../config');
const { getObjectPresignedURL } = require('../../lib/aws-s3');
const {
  addLocalizationField,
  addIconsToPaymentMethods,
  generateShortCode,
  formatError,
  toDateWithTZ,
  jsonToObject,
  publishStoreOrderSetSubscriptionEvent,
  publishStoreOrderSubscriptionEvent,
  transformToCamelCase,
  now,
  cloneObject,
  isNullOrUndefined,
  uuid,
} = require('../../lib/util');
const { convertLegacyPaymentMethod } = require('../order-payment-method/utils');

class StoreOrderSet extends BaseModel {
  constructor(db, context) {
    super(db, 'store_order_sets', context);
    this.loaders = createLoaders(this);
  }

  async getById(id) {
    if (!uuid.validate(id)) {
      const err = new Error('Invalid uuid');
      return err;
    }
    const result = await super.getById(id);
    return result;
  }

  filterStoreOrderSets(query, filters) {
    const dateRange = filters.dateRange;

    const startDate = get(dateRange, 'startDate');
    // console.log('startDate', startDate);
    const endDate = get(dateRange, 'endDate');

    if (startDate) {
      query.where(
        'store_order_sets.created',
        '>=',
        toDateWithTZ(startDate, 'start')
      );
    }

    if (endDate) {
      query.where(
        'store_order_sets.created',
        '<=',
        toDateWithTZ(endDate, 'end')
      );
    }

    if (filters.searchText) {
      filters.searchText = filters.searchText.toLowerCase().trim();
      query.whereRaw(
        `
          (store_order_sets.short_code iLike ? or
          concat(customers.first_name, ' ', customers.last_name) iLike ? or
          customers.email ilike ? )
        `
        , [`%${filters.searchText}%`, `%${filters.searchText}%`, `%${filters.searchText}%`],
      );
    }

    if (filters.countryId) {
      query.where('store_order_sets.country_id', filters.countryId);
    }

    if (filters.currencyId) {
      query.where('store_order_sets.currency_id', filters.currencyId);
    }

    if (filters.customerId) {
      query.where('store_order_sets.customer_id', filters.customerId);
    }

    if (filters.paid !== undefined) {
      query.where('store_order_sets.paid', filters.paid);
    }

    if (filters.statuses && filters.statuses.length > 0) {
      query.whereIn('store_order_set_statuses.status', filters.statuses);
    }

    return query;
  }
  getAll(filters) {
    let query = super
      .getAll()
      .select('store_order_sets.*')
      .join('customers', 'customers.id', 'store_order_sets.customer_id')
      .join('currencies', 'currencies.id', 'store_order_sets.currency_id')
      .joinRaw(
        `
        JOIN store_order_set_statuses
        ON store_order_set_statuses.id = (
          SELECT id
          FROM store_order_set_statuses
          WHERE store_order_set_statuses.store_order_set_id = store_order_sets.id
          ORDER BY created DESC
          LIMIT 1
        )
        `
      )
      .orderBy('store_order_sets.created', 'desc');
    if (filters) {
      query = this.filterStoreOrderSets(query, filters);
    }
    return query;
  }

  async getAllPaidPaged(paging, filters = {}) {
    const query = this.getAll({ ...filters, paid: true });
    return this.queryHelper(query)
      .addPaging(paging)
      .addCounting()
      .resolvePagedQuery();
  }

  async getAllPaged(paging, filters) {
    const query = this.getAll(filters);
    return this.queryHelper(query)
      .addPaging(paging)
      .addCounting()
      .resolvePagedQuery();
  }

  async storeOrderSetStatusTotal(filters) {
    const data = {
      placed: 0,
      partiallyDispatched: 0,
      dispatched: 0,
      partiallyDelivered: 0,
      delivered: 0,
      rejected: 0,
      canceled: 0,
    };
    const query = this.getAll(filters);
    query.clearSelect();
    query.clearOrder();
    query
      .select(
        this.db
          .raw(`sum(case when store_order_set_statuses.status = 'PLACED' then 1 else 0 end) as placed,
      sum(case when store_order_set_statuses.status = 'PARTIALLY_DISPATCHED' then 1 else 0 end) as partially_dispatched,
      sum(case when store_order_set_statuses.status = 'DISPATCHED' then 1 else 0 end) as dispatched,
      sum(case when store_order_set_statuses.status = 'PARTIALLY_DELIVERED' then 1 else 0 end) as partially_delivered,
      sum(case when store_order_set_statuses.status = 'DELIVERED' then 1 else 0 end) as delivered,
      sum(case when store_order_set_statuses.status = 'CANCELED' then 1 else 0 end) as canceled,
      sum(case when store_order_set_statuses.status = 'REJECTED' then 1 else 0 end) as rejected`)
      )
      .groupBy('store_order_set_statuses.status');
    const rows = await query;

    map(rows, row => {
      if (row) {
        map(Object.keys(row), key => {
          const total = Number.parseInt(row[key], 10);
          if (total > 0) {
            data[key] = total;
          }
        });
      }
    });

    return data;
  }

  async computeInvoice(storeOrderSet) {
    const currency = await this.context.currency.getById(
      storeOrderSet.currencyId
    );

    const newCurrencyValue = amount =>
      new Money(
        amount,
        currency.decimalPlace,
        currency.lowestDenomination
      ).toCurrencyValue();

    const components = [
      {
        type: invoiceComponentType.TOTAL,
        value: newCurrencyValue(storeOrderSet.total),
      },
      {
        type: invoiceComponentType.SUBTOTAL,
        value: newCurrencyValue(storeOrderSet.subtotal),
      },

      {
        type: invoiceComponentType.SERVICE_FEE,
        value: newCurrencyValue(storeOrderSet.fee),
      },
    ];
    if (storeOrderSet.paid) {
      components.push({
        type: invoiceComponentType.AMOUNT_DUE,
        value: newCurrencyValue(0),
      });
    } else {
      components.push({
        type: invoiceComponentType.AMOUNT_DUE,
        value: newCurrencyValue(storeOrderSet.amountDue),
      });
    }

    const prePaid = storeOrderSet.prePaid;
    let debitedAmount = 0;
    if (prePaid) {
      if (prePaid.creditsUsed && Number(prePaid.creditsUsed) > 0) {
        debitedAmount = Number(prePaid.creditsUsed);
      }
    }

    if (debitedAmount <= 0) {
      debitedAmount = await this.context.loyaltyTransaction.debitedForOrderId(
        storeOrderSet.id
      );
    }

    if (debitedAmount && Number(debitedAmount) > 0) {
      components.push({
        type: invoiceComponentType.CREDITS,
        value: newCurrencyValue(debitedAmount),
      });
    }

    return { components, currency };
  }

  async validateOrder(input) {
    const errors = [];
    const { customerId, customerAddressId, items, paymentMethod } = input;
    const customer = await this.context.customer.getById(customerId);
    if (!customer) {
      errors.push(storeOrderSetCreateError.INVALID_CUSTOMER);
    }
    const customerAddress = await this.context.customerAddress.getById(
      customerAddressId
    );
    if (!customerAddress) {
      errors.push(storeOrderSetCreateError.INVALID_CUSTOMER_ADDRESS);
    } else if (customerAddress.customerId !== customerId) {
      errors.push(storeOrderSetCreateError.WRONG_CUSTOMER_ADDRESS);
    }

    const validateItem = async item => {
      const errors = [];
      const product = await this.context.product.getById(item.id);
      if (!product) {
        errors.push(storeOrderSetCreateError.INVALID_PRODUCT);
      }
      if (item.quantity <= 0) {
        errors.push(storeOrderSetCreateError.ZERO_QUANTITY_REQUESTED);
      }

      if (
        paymentMethod
        && paymentMethod.paymentScheme === paymentSchemes.CASH
        && !product.cashOnDelivery
      ) {
        errors.push(storeOrderSetCreateError.CASH_NOT_AVAILABLE);
      }

      return errors;
    };

    const itemsErrors = uniq(
      flatten(await Promise.all(map(items, validateItem)))
    );
    errors.push(...itemsErrors);

    return errors;
  }

  getByShortCode(shortCode) {
    return this.db(this.tableName).where('short_code', shortCode.toUpperCase());
  }

  // getPaymentMethodDetails(input) {
  //   const paymentMethodInput = get(input, 'paymentMethod', false);
  //   const paymentMethod = paymentMethodInput.id;
  //   let paymentProvider = null;
  //   const usePaymentService = !includes(
  //     [orderPaymentMethods.CREDITS],
  //     paymentMethod
  //   );
  //   if (usePaymentService) {
  //     paymentProvider = paymentServices.MY_FATOORAH;
  //   }
  //
  //   return {
  //     paymentMethod,
  //     paymentProvider,
  //     usePaymentService,
  //     paymentMethodInput,
  //   };
  // }

  /* eslint-disable no-undef */
  async getUniqueShortCode() {
    const shortCode = generateShortCode();
    const [storeOrderSet] = await this.getByShortCode(shortCode);
    if (!storeOrderSet) {
      return shortCode;
    }
    return getUniqueShortCode();
  }

  getPrePaid(creditsUsed) {
    let prePaid = null;

    creditsUsed = creditsUsed || 0;
    if (Number(creditsUsed) > 0) {
      prePaid = {};
      prePaid.creditsUsed = Number(creditsUsed);
    }
    return prePaid;
  }

  // eslint-disable-next-line complexity
  async storeOrderSetCreate(input) {
    const { paymentMethod } = input;
    const storeOrderSet = pick(input, [
      'customerId',
      'src',
      'srcPlatform',
      'srcPlatformVersion',
    ]);
    storeOrderSet.receiptUrl = orderConfig.receiptUrl;
    storeOrderSet.errorUrl = orderConfig.errorUrl;
    const useCredits = get(input, 'useCredits', false);
    // let remainingCredits = 0;

    // const {
    //   paymentMethod,
    //   usePaymentService,
    //   paymentMethodInput,
    // } = this.getPaymentMethodDetails(input);

    let customerCardTokenSnapshot = null;
    let country = await this.context.customerAddress.getCountryByAddressId(
      input.customerAddressId
    );
    // With new customer address feature, it's country code is directly accessed from data itself
    if (isNullOrUndefined(country)) {
      country = await this.context.customerAddress.getCountryFromCountryCodeByAddressId(
        input.customerAddressId
      );
    }
    const {
      paymentProvider,
      customerCardToken,
    } = await this.context.paymentService.detectPaymentProviderViaPaymentMethod(
      paymentMethod
    );
    if (customerCardToken) {
      customerCardTokenSnapshot = cloneObject(customerCardToken);
      delete customerCardTokenSnapshot.providerRaw;
    }

    const customer = await this.context.customer.getById(
      storeOrderSet.customerId
    );
    const {
      products,
      currency,
      components,
      shipping,
    } = await this.orderPricingCalculations(input);
    const subtotal = find(
      components,
      c => c.type === invoiceComponentType.SUBTOTAL
    );
    const total = find(components, c => c.type === invoiceComponentType.TOTAL);
    const amountDue = find(
      components,
      c => c.type === invoiceComponentType.AMOUNT_DUE
    );
    const usedCredits = find(
      components,
      c => c.type === invoiceComponentType.CREDITS
    );
    const fee = find(
      components,
      c => c.type === invoiceComponentType.SERVICE_FEE
    );

    if ((!paymentProvider || !paymentMethod) && Number(amountDue.value) > 0) {
      await this.context.kinesisLogger.sendLogEvent(
        {
          rawStoreOrderInput: input,
          customer,
          products,
          currency,
          components,
          shipping,
          countryIso: country.isoCode,
          amountDue: amountDue.value,
          paymentProvider,
          paymentMethod,
          errorReason:
            'No Payment provider/method is given and ammount due is non-negative',
        },
        storeOrderCreateError
      );
      return {
        error: [storeOrderSetCreateError.PAYMENT_METHOD_REQUIRED],
      };
    }

    const shortCode = await this.getUniqueShortCode();
    const storeOrderSetId = await this.save({
      ...storeOrderSet,
      currencyId: currency.id,
      countryId: country ? country.id : null,
      shortCode,
      paymentMethod: paymentMethod ? paymentMethod.paymentScheme || null : null,
      paymentProvider,
      total: total.value,
      subtotal: subtotal.value,
      fee: fee.value,
      vat: country.vat,
      totalVat: country.vat,
      amountDue: amountDue.value,
    });

    await this.saveStoreOrderSetFulfillment(input, storeOrderSetId, shipping);

    // default payment status
    let paymentStatus = paymentStatusName.PAYMENT_PENDING;
    // default store order set status
    let storeOrderSetStatus = storeOrderSetStatusName.INITIATED;
    // default payment url
    let paymentUrl = null;
    // default payment response
    let paymentRawResponse = '{}';
    let debitCreditsAndGiftCardNow = true;
    if (Number(total.value) > 0) {
      // We are paying with customer credit balance
      if (paymentProvider && paymentMethod && Number(amountDue.value) > 0) {
        debitCreditsAndGiftCardNow = false;

        // this.save({ id: storeOrderSetId, amountDue: total.value });

        // save order payment method
        await this.context.orderPaymentMethod.save({
          orderType: paymentStatusOrderType.STORE_ORDER_SET,
          referenceOrderId: storeOrderSetId,
          paymentProvider,
          paymentMethod,
        });
        if (paymentMethod.paymentScheme === paymentSchemes.CASH) {
          debitCreditsAndGiftCardNow = true;
          paymentRawResponse = '{"isCash": true, "paid": false}';
          storeOrderSetStatus = storeOrderSetStatusName.PLACED;
        } else {
          const psResponse = await this.context.paymentService.pay({
            language: customer.preferedLanguage,
            currencyCode: currency.isoCode,
            countryCode: country.isoCode,
            countryId: country.id,
            amount: Number(amountDue.value),
            paymentMethod,
            referenceOrderId: storeOrderSetId,
            orderType: paymentStatusOrderType.STORE_ORDER_SET,
            customerId: customer.id,
            customerPhoneNumber: customer.phoneNumber,
          });

          if (psResponse.error) {
            // console.log(`Pay Response Error: ${psResponse.error} `);
            paymentStatus = paymentStatusName.PAYMENT_FAILURE;

            await this.context.storeOrderSetStatus.save({
              status: storeOrderSetStatus,
              storeOrderSetId,
            });
            // // eslint-disable-next-line max-depth
            // if (useCredits && usedCredits && Number(usedCredits.value) > 0) {
            //   await this.context.loyaltyTransaction.credit(
            //     storeOrderSetId,
            //     paymentStatusOrderType.STORE_ORDER_SET,
            //     storeOrderSet.customerId,
            //     Number(usedCredits.value),
            //     currency.id
            //   );
            //   await this.save({
            //     id: storeOrderSetId,
            //     refunded: true,
            //     amountDue: total.value,
            //   });
            // }

            await this.context.paymentStatus.save({
              referenceOrderId: storeOrderSetId,
              orderType: paymentStatusOrderType.STORE_ORDER_SET,
              name: paymentStatus,
              rawResponse: psResponse.error,
            });

            await this.context.kinesisLogger.sendLogEvent(
              {
                referenceOrderId: storeOrderSetId,
                orderType: paymentStatusOrderType.STORE_ORDER_SET,
                name: paymentStatus,
                storeOrderPaymentError: psResponse,
                errorReason: 'Payment Service Error',
              },
              storeOrderCreateError
            );

            return {
              error: [storeOrderSetCreateError.MERCHANT_INITIALIZATION_ERROR],
            };
          }
          await this.save({
            id: storeOrderSetId,
            merchantId: psResponse.id,
          });
          paymentUrl = psResponse.paymentUrl;
          paymentRawResponse = psResponse.rawResponse;
          if (psResponse.approved) {
            storeOrderSetStatus = storeOrderSetStatusName.PLACED;
            paymentStatus = paymentStatusName.PAYMENT_SUCCESS;
            await this.save({
              id: storeOrderSetId,
              paid: true,
              amountDue: 0.0,
            });
            amountDue.value = this.newCurrencyValue(currency, 0.0);
            debitCreditsAndGiftCardNow = true;
          }
        }

      } else {
        debitCreditsAndGiftCardNow = true;
      }
    } else {
      debitCreditsAndGiftCardNow = true;
      // won't happen ever
      storeOrderSetStatus = storeOrderSetStatusName.PLACED;
      paymentStatus = paymentStatusName.PAYMENT_SUCCESS;
      paymentRawResponse = '{"total": 0}';
      // mark order set true as the its paid by credits
      await this.save({
        id: storeOrderSetId,
        paid: true,
      });
    }

    // store prepaid credits and giftcards
    await this.save({
      id: storeOrderSetId,
      prePaid: this.getPrePaid(usedCredits ? Number(usedCredits.value) : 0),
    });
    if (debitCreditsAndGiftCardNow) {
      if (useCredits && usedCredits && Number(usedCredits.value) > 0) {
        await this.context.loyaltyTransaction.debit(
          storeOrderSetId,
          paymentStatusOrderType.STORE_ORDER_SET,
          storeOrderSet.customerId,
          Number(usedCredits.value),
          currency.id
        );
        // mark order set true as the its paid by credits
        if (Number(amountDue.value) === 0) {
          storeOrderSetStatus = storeOrderSetStatusName.PLACED;
          paymentStatus = paymentStatusName.PAYMENT_SUCCESS;
          paymentRawResponse = `{"isCredits": true, "paid": true, "creditsUsed": ${usedCredits.value}, "total": ${total.value}}`;
          await this.save({
            id: storeOrderSetId,
            paid: true,
            amountDue: 0.0,
          });

          await this.context.transaction.save({
            referenceOrderId: storeOrderSetId,
            orderType: paymentStatusOrderType.STORE_ORDER_SET,
            action: transactionAction.ORDER,
            type: transactionType.DEBITED,
            customerId: storeOrderSet.customerId,
            currencyId: currency.id,
            amount: Number(total.value) - Number(amountDue.value),
          });
        }
      }
    }

    await this.saveStoreOrder(products, storeOrderSetId, storeOrderSetStatus);

    // Insert Initial Order set Status
    await this.context.storeOrderSetStatus.save({
      status: storeOrderSetStatus,
      storeOrderSetId,
    });

    // Insert Initial Payment Status
    await this.context.paymentStatus.save({
      referenceOrderId: storeOrderSetId,
      orderType: paymentStatusOrderType.STORE_ORDER_SET,
      name: paymentStatus,
      rawResponse: paymentRawResponse,
    });

    const savedStoreOrderSet = await this.getById(storeOrderSetId);

    await this.context.kinesisLogger.sendLogEvent(
      {
        debitCreditsAndGiftCardNow,
        rawStoreOrderInput: input,
        customer,
        countryIso: country.isoCode,
        storeOrderSet: savedStoreOrderSet,
        paymentUrl,
        paymentStatus,
        paymentMethod,
        rawPaymentResponse: paymentRawResponse,
        orderDetails: {
          products,
          currency,
          components,
          shipping,
        },
      },
      storeOrderCreateSuccess
    );

    return {
      storeOrderSet: savedStoreOrderSet,
      paymentUrl,
      paymentStatus,
      paymentMethod,
    };
  }

  newCurrencyValue(currency, amount) {
    return new Money(
      amount,
      currency.decimalPlace,
      currency.lowestDenomination,
    ).toCurrencyValue();
  }

  // async _storeOrderSetCreate(input) {
  //   const storeOrderSet = pick(input, [
  //     'customerId',
  //     'receiptUrl',
  //     'errorUrl',
  //     'src',
  //     'srcPlatform',
  //     'srcPlatformVersion',
  //   ]);
  //   const {
  //     paymentMethod,
  //     usePaymentService,
  //     paymentMethodInput,
  //   } = this.getPaymentMethodDetails(input);
  //
  //   let paymentService = null;
  //   let customerCardTokenSnapshot = null;
  //   if (usePaymentService) {
  //     const {
  //       paymentProvider,
  //       customerCardToken,
  //     } = await this.context.paymentService.detectPaymentProvider({
  //       paymentMethod: paymentMethodInput,
  //     });
  //     paymentService = paymentProvider || null;
  //     customerCardTokenSnapshot = customerCardToken || null;
  //     if (customerCardTokenSnapshot) {
  //       delete customerCardTokenSnapshot.providerRaw;
  //     }
  //   }
  //
  //   const customer = await this.context.customer.getById(
  //     storeOrderSet.customerId
  //   );
  //   const country = await this.context.customerAddress.getCountryByAddressId(
  //     input.customerAddressId
  //   );
  //   const {
  //     products,
  //     currency,
  //     components,
  //     shipping,
  //   } = await this.orderPricingCalculations(input);
  //   const subtotal = find(
  //     components,
  //     c => c.type === invoiceComponentType.SUBTOTAL
  //   );
  //   const total = find(components, c => c.type === invoiceComponentType.TOTAL);
  //   const fee = find(
  //     components,
  //     c => c.type === invoiceComponentType.SERVICE_FEE
  //   );
  //
  //   if (paymentMethod === orderPaymentMethods.CREDITS) {
  //     // Validate that the customer has enought credit
  //     const customerBalance = await this.context.loyaltyTransaction.getBalanceByCustomer(
  //       customer.id,
  //       currency.id
  //     );
  //
  //     if (Number(customerBalance) < Number(total.value)) {
  //       return {
  //         error: [storeOrderSetCreateError.INSUFFICIENT_CREDITS],
  //       };
  //     }
  //   }
  //
  //   const shortCode = await this.getUniqueShortCode();
  //   const storeOrderSetId = await this.save({
  //     ...storeOrderSet,
  //     currencyId: currency.id,
  //     countryId: country ? country.id : null,
  //     shortCode,
  //     paymentMethod,
  //     paymentProvider: paymentService,
  //     total: total.value,
  //     subtotal: subtotal.value,
  //     fee: fee.value,
  //     vat: country.vat,
  //     totalVat: country.vat,
  //   });
  //
  //   // save order payment method
  //   await this.context.orderPaymentMethod.save({
  //     orderType: paymentStatusOrderType.STORE_ORDER_SET,
  //     referenceOrderId: storeOrderSetId,
  //     paymentService,
  //     paymentMethod: paymentMethodInput,
  //   });
  //
  //   await this.saveStoreOrderSetFulfillment(input, storeOrderSetId, shipping);
  //
  //   // default payment status
  //   let paymentStatus = paymentStatusName.PAYMENT_PENDING;
  //   // default store order set status
  //   let storeOrderSetStatus = storeOrderSetStatusName.INITIATED;
  //   // default payment url
  //   let paymentUrl = null;
  //   // default payment response
  //   let paymentRawResponse = '';
  //   if (Number(total.value) > 0) {
  //     if (usePaymentService) {
  //       // const psResponse = await myFatoorah.executePayment(this.db, {
  //       //   language: customer.preferedLanguage,
  //       //   currencyCode: currency.isoCode,
  //       //   countryCode: country.isoCode,
  //       //   amount: total.value,
  //       //   paymentMethod,
  //       //   referenceOrderId: storeOrderSetId,
  //       //   orderType: paymentStatusOrderType.STORE_ORDER_SET,
  //       // });
  //       // if (psResponse.error) {
  //       //   paymentStatus = paymentStatusName.PAYMENT_FAILURE;
  //       //
  //       //   await this.context.paymentStatus.save({
  //       //     referenceOrderId: storeOrderSetId,
  //       //     orderType: paymentStatusOrderType.STORE_ORDER_SET,
  //       //     name: paymentStatus,
  //       //     rawResponse: psResponse.error,
  //       //   });
  //       //
  //       //   await this.context.storeOrderSetStatus.save({
  //       //     status: storeOrderSetStatus,
  //       //     storeOrderSetId,
  //       //   });
  //       //
  //       //   return {
  //       //     error: [storeOrderSetCreateError.MERCHANT_INITIALIZATION_ERROR],
  //       //   };
  //       // }
  //       // await this.save({
  //       //   id: storeOrderSetId,
  //       //   merchantId: psResponse.id,
  //       // });
  //       // paymentUrl = psResponse.paymentUrl;
  //       // paymentRawResponse = psResponse.rawResponse;
  //       const psResponse = await this.context.paymentService.pay({
  //         language: customer.preferedLanguage,
  //         currencyCode: currency.isoCode,
  //         countryCode: country.isoCode,
  //         amount: total.value,
  //         paymentMethod: paymentMethodInput,
  //         referenceOrderId: storeOrderSetId,
  //         orderType: paymentStatusOrderType.STORE_ORDER_SET,
  //         customerId: customer.id,
  //       });
  //
  //       if (psResponse.error) {
  //         paymentStatus = paymentStatusName.PAYMENT_FAILURE;
  //
  //         await this.context.paymentStatus.save({
  //           referenceOrderId: storeOrderSetId,
  //           orderType: paymentStatusOrderType.STORE_ORDER_SET,
  //           name: paymentStatus,
  //           rawResponse: psResponse.error,
  //         });
  //
  //         await this.context.storeOrderSetStatus.save({
  //           status: storeOrderSetStatus,
  //           storeOrderSetId,
  //         });
  //
  //         return {
  //           error: [storeOrderSetCreateError.MERCHANT_INITIALIZATION_ERROR],
  //         };
  //       }
  //       await this.save({
  //         id: storeOrderSetId,
  //         merchantId: psResponse.id,
  //       });
  //       paymentUrl = psResponse.paymentUrl;
  //       paymentRawResponse = psResponse.rawResponse;
  //       if (psResponse.approved) {
  //         storeOrderSetStatus = storeOrderSetStatusName.PLACED;
  //         paymentStatus = paymentStatusName.PAYMENT_SUCCESS;
  //         await this.save({
  //           id: storeOrderSetId,
  //           paid: true,
  //         });
  //       }
  //     } else if (paymentMethod === orderPaymentMethods.CREDITS) {
  //       // We are paying with customer credit balance
  //       await this.context.loyaltyTransaction.debit(
  //         storeOrderSetId,
  //         paymentStatusOrderType.STORE_ORDER_SET,
  //         storeOrderSet.customerId,
  //         total.value,
  //         currency.id
  //       );
  //       // mark order set true as the its paid by credits
  //       await this.save({
  //         id: storeOrderSetId,
  //         paid: true,
  //       });
  //       storeOrderSetStatus = storeOrderSetStatusName.PLACED;
  //       paymentStatus = paymentStatusName.PAYMENT_SUCCESS;
  //       paymentRawResponse = `{"isCredits": true, "paid": true, "total": ${total.value}}`;
  //     }
  //   } else {
  //     // won't happen ever
  //     storeOrderSetStatus = storeOrderSetStatusName.PLACED;
  //     paymentStatus = paymentStatusName.PAYMENT_SUCCESS;
  //     paymentRawResponse = '{"total": 0}';
  //     // mark order set true as the its paid by credits
  //     await this.save({
  //       id: storeOrderSetId,
  //       paid: true,
  //     });
  //   }
  //
  //   await this.saveStoreOrder(products, storeOrderSetId, storeOrderSetStatus);
  //
  //   // Insert Initial Order set Status
  //   await this.context.storeOrderSetStatus.save({
  //     status: storeOrderSetStatus,
  //     storeOrderSetId,
  //   });
  //
  //   // Insert Initial Payment Status
  //   await this.context.paymentStatus.save({
  //     referenceOrderId: storeOrderSetId,
  //     orderType: paymentStatusOrderType.STORE_ORDER_SET,
  //     name: paymentStatus,
  //     rawResponse: paymentRawResponse,
  //   });
  //
  //   // add payment transaction
  //   if (
  //     Number(total.value) > 0 &&
  //     paymentStatus === paymentStatusName.PAYMENT_SUCCESS
  //   ) {
  //     await this.context.transaction.save({
  //       referenceOrderId: storeOrderSetId,
  //       orderType: paymentStatusOrderType.STORE_ORDER_SET,
  //       action: transactionAction.ORDER,
  //       type: transactionType.DEBITED,
  //       customerId: storeOrderSet.customerId,
  //       currencyId: currency.id,
  //       amount: total.value,
  //     });
  //   }
  //
  //   return {
  //     storeOrderSet: await this.getById(storeOrderSetId),
  //     paymentUrl,
  //     paymentStatus,
  //     paymentMethod,
  //   };
  // }

  async saveStoreOrderSetFulfillment(input, storeOrderSetId, shipping) {
    const customerAddress = await this.context.customerAddress.getById(
      input.customerAddressId
    );

    const { deliveryWindowMin } = await this.context.configuration.getCurrent();
    const time = moment(now.get());
    // Infer a fallback `asap` flag, used for delivery orders
    // Pickup orders already explicitly pass the flag
    const asapDeliveryTime = moment(now.get());
    asapDeliveryTime.add(Number(deliveryWindowMin), 'minutes');

    const asap = moment(time).isSameOrBefore(asapDeliveryTime);
    const orderFulfillment = {
      type: orderTypes.DELIVERY,
      note: '',
      fee: shipping.deliveryFee,
      deliveryEstimate: shipping.deliveryEstimate,
      time,
      asap,
      deliveryAddress: customerAddress,
    };
    await this.context.storeOrderSetFulfillment.save({
      ...orderFulfillment,
      storeOrderSetId,
    });
  }

  /* eslint-disable no-undef */
  async getUniqueStoreOrderShortCode() {
    const shortCode = generateShortCode();
    const [storeOrderSet] = await this.context.storeOrder.getByShortCode(
      shortCode
    );
    if (!storeOrderSet) {
      return shortCode;
    }
    return getUniqueStoreOrderShortCode();
  }

  async saveStoreOrder(products, storeOrderSetId, storeOrderSetStatus) {
    let storeOrders = [];
    let shortCodes = [];

    const productIds = map(products, p => p.id);

    const productsImages = await this.context.productImage.prouctsImages(
      productIds
    );

    if (!isEmpty(products)) {
      products = map(products, p => {
        p.totalPrice = Number(p.totalPrice);
        const image = find(productsImages, pi => pi.productId === p.id);
        p.image = image ? image.url : null;
        return p;
      });
      storeOrders = map(groupBy(products, 'brandId'), (objs, key) => {
        shortCodes.push(this.getUniqueShortCode());
        return {
          brandId: key,
          total: sumBy(objs, 'totalPrice'),
          storeOrderSetId,
          acknowledged: false,
        };
      });
      shortCodes = await Promise.all(shortCodes);

      storeOrders = map(storeOrders, (so, index) => {
        so.shortCode = shortCodes[index];
        return so;
      });

      storeOrders = map(storeOrders, so =>
        this.context.storeOrder.createStoreOrder(
          so,
          filter(products, p => so.brandId === p.brandId),
          storeOrderSetStatus
        )
      );
    }
    return storeOrders;
  }

  /**
  Determines the appropriate notifications that must be sent in response to a payment status change. Broken out into a separate function for testability.
  @param {String} storeOrderSetId The associated order set id.
  @param {String} statusName The payment status name, e.g. "PAYMENT_SUCCESS"
  @return {Object} An object with three arrays: push, sms, and email. Each array contains objects that can be passed to the pushCreate, smsCreate, and emailCreate functions in notifications.js
  Developers should not use this function directly, but rather the associated function called `sendPaymentStatusChangeNotifications()`.
  */
  async paymentStatusChangeNotifications(
    storeOrderSetId,
    paymentStatusName,
    knetResponse,
    context
  ) {
    let sendNotfication = true;
    const emptySet = { push: [], email: [] };

    const knetResponseValues = jsonToObject(knetResponse);
    const isCash = get(knetResponseValues, 'isCash', false);
    const paid = get(knetResponseValues, 'paid', false);
    // we wont send if payment is not successful
    if (paymentStatusName !== 'PAYMENT_SUCCESS') {
      sendNotfication = false;
    }
    // but send if the order is paid by cash. at the time when its placed and when its completed.
    if (isCash && !paid) {
      sendNotfication = true;
    } else if (isCash && paid) {
      sendNotfication = false;
    }

    if (!sendNotfication) {
      return Promise.resolve(emptySet);
    }

    const rendering = await renderConfirmationEmail(
      context,
      storeOrderSetId,
      paymentStatusName,
      knetResponse
    );
    // const rendering = false;
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
      email: [emailArgs],
    };
    return Promise.resolve(result);
  }

  /**
  Sends customer notifications indicated by the payment status change.
  */
  async sendPaymentStatusChangeNotifications(
    storeOrderSetId,
    paymentStatusName,
    knetResponse
  ) {
    const notifications = await this.paymentStatusChangeNotifications(
      storeOrderSetId,
      paymentStatusName,
      knetResponse,
      this.context
    );
    return this.context.notification.createAllIn(notifications);
  }

  async calculateCredit(customerBalance, total) {
    let credits = 0.0;
    // Validate that the customer has enought credit

    if (Number(customerBalance) < Number(total)) {
      credits = Number(customerBalance);
    } else {
      credits = Number(total);
    }
    return credits;
  }

  async calculateAmountDue(customerBalance, total) {
    let amountDue = total;

    if (Number(customerBalance) < Number(total)) {
      amountDue = Number(total) - Number(customerBalance);
    } else {
      amountDue = 0.0;
    }

    return amountDue;
  }

  async orderPricingCalculations(input) {
    const { customerId } = input;
    const useCredits = get(input, 'useCredits', false);

    const { products, currency } = await this.getProductsWithPrice(input.items);
    const calculation = await this.calculatePrice(products, currency);

    const shipping = await this.calculateShipping(input, calculation);

    calculation.total = new Money(
      calculation.subtotal,
      currency.decimalPlace,
      currency.lowestDenomination
    )
      .add(shipping.deliveryFee)
      .toCurrencyValue();

    calculation.amountDue = calculation.total;

    let creditsUsed = 0.0;

    if (useCredits) {
      const customerBalance = await this.context.loyaltyTransaction.getBalanceByCustomer(
        customerId,
        currency.id
      );
      creditsUsed = await this.calculateCredit(
        customerBalance,
        calculation.total
      );
      calculation.amountDue = await this.calculateAmountDue(
        customerBalance,
        calculation.total
      );
    }

    const components = [
      {
        type: invoiceComponentType.TOTAL,
        value: this.newCurrencyValue(currency, calculation.total),
      },
      {
        type: invoiceComponentType.SUBTOTAL,
        value: this.newCurrencyValue(currency, calculation.subtotal),
      },
      {
        type: invoiceComponentType.AMOUNT_DUE,
        value: this.newCurrencyValue(currency, calculation.amountDue),
      },
      {
        type: invoiceComponentType.SERVICE_FEE,
        value: this.newCurrencyValue(currency, shipping.deliveryFee),
      },
    ];

    if (creditsUsed > 0) {
      components.push({
        type: invoiceComponentType.CREDITS,
        value: this.newCurrencyValue(currency, creditsUsed),
      });
    }
    return {
      components,
      products,
      shipping,
      currency: addLocalizationField(
        addLocalizationField(currency, 'symbol'),
        'subunitName'
      ),
    };
  }

  async debitAndProcessPayment(order, paymentStatus, rawResponse) {
    const [
      currentPaymentStatus,
    ] = await this.context.paymentStatus.getAllByStoreOrderSetId(order.id);

    const newPaymentStatus = {
      referenceOrderId: order.id,
      orderType: paymentStatusOrderType.STORE_ORDER_SET,
      name: paymentStatus,
      rawResponse: JSON.stringify(rawResponse),
    };

    if (paymentStatus === paymentStatusName.PAYMENT_SUCCESS) {
      if (paymentStatus === currentPaymentStatus.name) {
        console.log(
          `${paymentStatusName.PAYMENT_SUCCESS} already processed for ${order.id}`
        );
      } else {
        const prePaid = order.prePaid;

        if (prePaid) {
          // if credits are used
          prePaid.creditsUsed = prePaid.creditsUsed || 0;
          // prePaid.giftCards = prePaid.giftCards || [];
          if (Number(prePaid.creditsUsed) > 0) {
            await this.context.loyaltyTransaction.debit(
              order.id,
              paymentStatusOrderType.STORE_ORDER_SET,
              order.customerId,
              Number(prePaid.creditsUsed),
              order.currencyId
            );
          }
          // if gift card was used
          // if (prePaid.giftCards.length > 0) {
          //   await this.context.giftCardTransaction.debit({
          //     giftCardId: prePaid.giftCards[0].id,
          //     referenceOrderId: order.id,
          //     orderType: paymentStatusOrderType.STORE_ORDER_SET,
          //     customerId: order.customerId,
          //     amount: Number(prePaid.giftCards[0].value),
          //     currencyId: order.currencyId,
          //   });
          // }
        }
        // mark paid
        await this.save({ id: order.id, paid: true, amountDue: 0.0 });
        // mark store order set status PLACED
        await this.context.storeOrderSetStatus.save({
          status: storeOrderSetStatusName.PLACED,
          storeOrderSetId: order.id,
        });

        // update status for store orders
        await this.context.storeOrderStatus.insertStatusByStoreOrderSet(
          order.id,
          storeOrderStatusName.PLACED
        );

        await this.context.paymentStatus.save(newPaymentStatus);

        // add payment transaction
        await this.context.transaction.save({
          referenceOrderId: order.id,
          action: transactionAction.ORDER,
          orderType: paymentStatusOrderType.STORE_ORDER_SET,
          type: transactionType.DEBITED,
          customerId: order.customerId,
          currencyId: order.currencyId,
          amount: order.total,
        });
        // if order is already processed transaction have to fail
        // with this insert
        await this.db('successful_payment_transactions').insert({
          referenceOrderId: order.id
        });
        return true;
      }
    } else {
      // if (!order.refunded) {
      //   const debitedAmount = await this.context.loyaltyTransaction.debitedForOrderId(
      //     order.id
      //   );
      //   if (debitedAmount && Number(debitedAmount) > 0) {
      //     await this.context.loyaltyTransaction.credit(
      //       order.id,
      //       paymentStatusOrderType.STORE_ORDER_SET,
      //       order.customerId,
      //       Number(debitedAmount),
      //       order.currencyId
      //     );
      //     await this.save({
      //       id: order.id,
      //       refunded: true,
      //       amountDue: order.total,
      //     });
      //     await this.context.transaction.save({
      //       referenceOrderId: order.id,
      //       action: transactionAction.REFUND,
      //       orderType: paymentStatusOrderType.STORE_ORDER_SET,
      //       type: transactionType.CREDITED,
      //       customerId: order.customerId,
      //       currencyId: order.currencyId,
      //       amount: Number(debitedAmount),
      //     });
      //   }
      // }
      await this.context.paymentStatus.save(newPaymentStatus);
    }
    return false;
  }

  async resolvePaymentCallback(psResponse) {
    const { referenceOrderId, paymentStatus, rawResponse } = psResponse;
    const order = await this.getById(referenceOrderId);
    if (!order) {
      return formatError([`order ${referenceOrderId} not found`]);
    }
    // testing
    // paymentStatus = paymentStatusName.PAYMENT_SUCCESS;
    await this.context.withTransaction(
      'storeOrderSet',
      'debitAndProcessPayment',
      order,
      paymentStatus,
      rawResponse
    ).then(result => {
      if (result) {
        this.publishNewStoreOrderSet(this.context, order.id);
      }
    }).catch(err => {
      const errObj = {
        psResponse,
        err: err?.message,
      };
      this.context.kinesisLogger.sendLogEvent(
        errObj,
        'resolvePaymentCallback-error'
      );
    });

    return {
      redirect:
        paymentStatus === paymentStatusName.PAYMENT_SUCCESS
          ? order.receiptUrl
          : order.errorUrl,
      trackid: order.id,
      paymentMethod: order.paymentMethod,
    };
  }

  async publishNewStoreOrderSet(context, storeOrderSetId) {
    await publishStoreOrderSetSubscriptionEvent(
      context,
      storeOrderSetId,
      storeOrderSetSubscriptionEvent.STORE_ORDER_SET_CREATED
    );
    let storeOrders = await context.storeOrder.getAllByStoreOrderSet(
      storeOrderSetId
    );
    if (!isEmpty(storeOrders)) {
      storeOrders = map(storeOrders, so =>
        publishStoreOrderSubscriptionEvent(
          context,
          so.id,
          storeOrderSubscriptionEvent.STORE_ORDER_CREATED
        )
      );
      await Promise.all(storeOrders);
    }
  }

  async getProductsWithPrice(items) {
    const productIds = map(items, item => item.id);
    const currency = await this.context.product.getCurrency(productIds[0]);
    return {
      currency,
      products: map(await this.context.product.getById(productIds), product => {
        const { quantity } = find(items, item => item.id === product.id);
        const totalPrice = new Money(
          product.price,
          currency.decimalPlace,
          currency.lowestDenomination
        )
          .mult(quantity)
          .toCurrencyValue();
        return { ...product, quantity, totalPrice };
      }),
    };
  }

  async calculatePrice(products, currency) {
    let subtotal = new Money(
      0,
      currency.decimalPlace,
      currency.lowestDenomination
    );
    map(products, product => {
      subtotal = subtotal.add(product.totalPrice);
    });
    return {
      subtotal: subtotal.toCurrencyValue(),
    };
  }

  async calculateShipping(input, calculation) {
    const { customerAddressId, items } = input;
    const productIds = map(items, item => item.id);
    const pickupLocations = await this.context.product.getPickupLocationsWithDeliveryAddressDistance(
      productIds,
      customerAddressId
    );
    const furthestPickupLocation = maxBy(pickupLocations, function (o) {
      return Number(o.distance);
    });
    const brand = await this.context.brand.getById(
      furthestPickupLocation.brandId
    );

    const country = await this.context.country.getById(brand.countryId);

    const shippingPolicies = groupBy(
      await this.context.shippingPolicy.getAll({
        status: statusTypes.ACTIVE,
        countryId: brand.countryId,
      }),
      'property'
    );
    // default delivery params
    let deliveryFee = 1;
    const deliveryEstimate = country.storeOrderDeliveryTime ? country.storeOrderDeliveryTime * 24 : 24;
    if (
      shippingPolicies[shippingPolicyProperty.DISTANCE] &&
      furthestPickupLocation
    ) {
      // sort by distance asc
      const sortedShippingPolicies = sortBy(
        shippingPolicies[shippingPolicyProperty.DISTANCE],
        [
          function (o) {
            return Number(o.value);
          },
        ]
      );
      // console.log(sortedShippingPolicies);
      // check all policies from shortest distance to furthest.
      // the last one that meet the condition is the valid one
      map(sortedShippingPolicies, shippingPolicy => {
        if (
          shippingPolicy.comparisionOperator ===
          comparisionOperator.GREATER_THAN_OR_EQUAL
        ) {
          if (
            Number(furthestPickupLocation.distance) >=
            Number(shippingPolicy.value)
          ) {
            deliveryFee = shippingPolicy.cost;
            //deliveryEstimate = shippingPolicy.deliveryEstimate;
          }
        }
      });
    }

    if (shippingPolicies[shippingPolicyProperty.CART_COST]) {
      // sort by cart cost asc
      const sortedShippingPolicies = sortBy(
        shippingPolicies[shippingPolicyProperty.CART_COST],
        [
          function (o) {
            return Number(o.value);
          },
        ]
      );

      // console.log(sortedShippingPolicies);
      // check all policies from shortest distance to furthest.
      // the last one that meet the condition is the valid one
      // CART_COST policies affects only delivery cost
      map(sortedShippingPolicies, shippingPolicy => {
        if (
          shippingPolicy.comparisionOperator ===
          comparisionOperator.GREATER_THAN_OR_EQUAL
        ) {
          if (Number(calculation.subtotal) >= Number(shippingPolicy.value)) {
            deliveryFee = shippingPolicy.cost;
          }
        }
      });
    }
    return { deliveryFee, deliveryEstimate };
  }

  async getAvailablePaymentMethods({
    total: amount,
    currencyCode,
    countryCode,
  }) {
    const currency = await this.context.currency.getByCode(currencyCode);
    let paymentMethods = [
      {
        id: orderPaymentMethods.CREDITS,
        name: 'COFE Credits',
        nameAr: 'رصيد كوفي',
        nameTr: 'COFE Kredileri',
        serviceCharge: 0,
        totalAmount: amount,
        directPayment: false,
        currency: addLocalizationField(
          addLocalizationField(currency, 'code'),
          'subunitName'
        ),
      },
    ];

    const customerId =
      this.context.auth && this.context.auth.id ? this.context.auth.id : null;

    const providerPaymentMethods = await this.context.paymentService.getPaymentMethods(
      {
        countryCode,
        currencyCode,
        customerId,
        amount,
      }
    );

    providerPaymentMethods.map(providerPaymentMethod => {
      paymentMethods.push({
        ...providerPaymentMethod,
        currency: addLocalizationField(
          addLocalizationField(currency, 'symbol'),
          'subunitName'
        ),
      });
      return providerPaymentMethod;
    });

    paymentMethods = addIconsToPaymentMethods(paymentMethods);
    return addLocalizationField(paymentMethods, 'name');
  }

  async getPastStoreOrdersByCustomer(customerId, paging) {
    const query = `
${this.sqlForStoreOrderWithStatuses()}
WHERE
  soss.status IN (
    '${storeOrderSetStatusName.DELIVERED}',
    '${storeOrderSetStatusName.REJECTED}',
    '${storeOrderSetStatusName.CANCELED}'
  )
  AND sos.customer_id = ?
ORDER BY sos.created DESC
OFFSET ? LIMIT ?
`;
    const limit = get(paging, 'limit', 20);
    const offset = get(paging, 'offset', 0);

    return this.db
      .raw(query, [customerId, offset, limit])
      .then(result => transformToCamelCase(result.rows));
  }

  async getUpcomingStoreOrdersByCustomer(customerId, paging) {
    const query = `
${this.sqlForStoreOrderWithStatuses()}
WHERE
  soss.status IN (
    '${storeOrderSetStatusName.PLACED}',
    '${storeOrderSetStatusName.PARTIALLY_DISPATCHED}',
    '${storeOrderSetStatusName.DISPATCHED}',
    '${storeOrderSetStatusName.PARTIALLY_DELIVERED}'
  )
  AND
  sos.customer_id = ?
ORDER BY sos.created DESC
OFFSET ? LIMIT ?
`;
    const limit = get(paging, 'limit', 20);
    const offset = get(paging, 'offset', 0);

    return this.db
      .raw(query, [customerId, offset, limit])
      .then(result => transformToCamelCase(result.rows));
  }

  sqlForStoreOrderWithStatuses() {
    return `
    SELECT sos.*
    FROM   store_order_sets AS sos
    JOIN store_order_set_statuses AS soss
      ON soss.id = (SELECT id
                    FROM   store_order_set_statuses
                    WHERE  store_order_set_statuses.store_order_set_id = sos.id
                    ORDER  BY created DESC
                    LIMIT  1)
`;
  }

  async storeOrderSetRefund(storeOrderSetId) {
    await storeOrderSetRefund(this.context)(storeOrderSetId);
  }

  async validateStoreOrderSetRefund(storeOrderSetId) {
    const result = await validateStoreOrderSetRefund(this.context)(
      storeOrderSetId
    );
    return result;
  }

  async getStoreOrderInvoiceURL({ id }) {
    const storeOrderSet = await this.getById(id);
    if (storeOrderSet && storeOrderSet.countryId && storeOrderSet.shortCode) {
      const country = await this.context.country.getById(storeOrderSet.countryId);
      if (country) {
        const cfg = invoice.storeOrder[country.isoCode];
        if (cfg) {
          const fullKey = `${cfg.folderPath}/INV-${storeOrderSet.shortCode}.pdf`;
          const url = await getObjectPresignedURL(cfg.bucket, fullKey, cfg.signedUrlExpireSeconds);
          return url;
        }
      }
    }
    return null;
  }

  async getPaymentMethod({ id }) {
    const orderPaymentMethod = await this.context.orderPaymentMethod.getStoreOrderSetPaymentMethod(
      id,
    );
    let paymentMethod =
      orderPaymentMethod && orderPaymentMethod.paymentMethod
        ? orderPaymentMethod.paymentMethod
        : {};

    // paymentMethod is a json field and sometimes it comes as a stringify json
    // so we need to parse it again
    if (typeof paymentMethod === 'string') {
      paymentMethod = JSON.parse(paymentMethod);
    }

    if (paymentMethod.paymentScheme) {
      return paymentMethod;
    } else if (paymentMethod.id) {
      return convertLegacyPaymentMethod(paymentMethod);
    }

    return null;
  }

  async getPaymentMethodLabel(storeOrderSet) {
    const computeInvoiceComponentsPromise = this.computeInvoice(storeOrderSet);
    const paymentMethodPromise = this.getPaymentMethod({ id: storeOrderSet.id });

    const [computeInvoiceComponents, paymentMethod] = await Promise.all([computeInvoiceComponentsPromise, paymentMethodPromise]);

    const methods = [];

    if (paymentMethod) methods.push(paymentMethod.paymentScheme);

    const isCredits = find(computeInvoiceComponents.components, t => t.type === orderPaymentMethods.CREDITS);
    if (isCredits) methods.push(orderPaymentMethods.CREDITS);

    const isGiftCard = find(computeInvoiceComponents.components, t => t.type === orderPaymentMethods.GIFT_CARD);
    if (isGiftCard) methods.push(orderPaymentMethods.GIFT_CARD);

    const localizedList = methods.map(t => this.getLocalizedMethodTitle(t));
    const result = localizedList.reduce((prev, curr) => {
      return {
        en: `${prev?.en} + ${curr?.en}`,
        ar: `${prev?.ar} + ${curr?.ar}`,
        tr: `${prev?.tr} + ${curr?.tr}`,
      };
    });
    return result;
  }

  getLocalizedMethodTitle(key) {
    // TODO: super bad codes, need to refactor all
    const methods = {
      SUBTOTAL: {
        en: 'Subtotal',
        ar: 'المجموع الفرعي',
        tr: 'Ara Toplam',
      },
      LEGACY: {
        en: 'Legacy',
        ar: 'Legacy',
        tr: 'Legacy',
      },
      KNET: {
        en: 'KNET',
        ar: 'كي نت',
        tr: 'KNET',
      },
      CASH: {
        en: 'Cash',
        ar: 'نقدًا',
        tr: 'Nakit',
      },
      STC_PAY: {
        en: 'STC Pay',
        ar: 'STC Pay',
        tr: 'STC Pay',
      },
      MADA: {
        en: 'MADA',
        ar: 'MADA',
        tr: 'MADA',
      },
      AMEX: {
        en: 'AMEX',
        ar: 'AMEX',
        tr: 'AMEX',
      },
      TOKEN: {
        en: 'Token',
        ar: 'Token',
        tr: 'Token',
      },
      CARD: {
        en: 'Card',
        ar: 'بطاقة',
        tr: 'Kart',
      },
      SAVED_CARD: {
        en: 'Saved Card',
        ar: 'البطاقة المحفوظة',
        tr: 'Kayıtlı Kart',
      },
      APPLE_PAY: {
        en: 'Apple Pay',
        ar: 'Apple Pay',
        tr: 'Apple Pay',
      },
      GOOGLE_PAY: {
        en: 'Google Pay',
        ar: 'Google Pay',
        tr: 'Google Pay',
      },
      GIFT_CARD: {
        en: 'Gift Card',
        ar: 'كرت هدية',
        tr: 'Hediye Kartı',
      },
      VOUCHER: {
        en: 'Voucher',
        ar: 'رمز الخصم',
        tr: 'Kupon',
      },
      CREDITS: {
        en: 'Credits',
        ar: 'ائتمانات',
        tr: 'Kredi',
      },
      DISCOVERY_CREDITS: {
        en: 'Discovery Points',
        ar: 'رصيد مجاني',
        tr: 'Keşif Puanı',
      },
      VISA: {
        en: 'Visa',
        ar: 'Visa',
        tr: 'Visa',
      },
      MASTER_CARD: {
        en: 'Master Card',
        ar: 'Master Card',
        tr: 'Master Card',
      },
      AMERICAN_EXPRESS: {
        en: 'American Express',
        ar: 'American Express',
        tr: 'American Express',
      },
      REWARD_DISCOUNT: {
        en: 'Reward Discount',
        ar: 'Reward Discount',
        tr: 'Reward Discount',
      },
      CASHBACK: {
        en: 'Cashback',
        ar: 'Cashback',
        tr: 'Cashback',
      }
    };
    if (!methods[key]) {
      return {
        en: upperFirst(key.replace('_', ' ')),
      };
    }
    return methods[key];
  }

  async getStoreOrderSetsByCustomer(customerId, scanedPastYear = 0, countryId, paging = { pageNo: 1, perPage: 10 }) {
    scanedPastYear = scanedPastYear < 0 ? 0 : scanedPastYear;
    const startDate = moment()
      .subtract(scanedPastYear, 'year')
      .startOf('year');
    const endDate = moment()
      .subtract(scanedPastYear, 'year')
      .endOf('year');
    let storeOrders = await this.db
      .raw(`Select sos.id, sos.short_code, sos.created, sos.total,
      sos.customer_id, sos.country_id, so.id as store_order_id, so.brand_id,
      CASE WHEN (
              soss.status IS NULL OR
              soss.status = '${storeOrderStatusName.DELIVERED}' OR
              soss.status = '${storeOrderStatusName.REJECTED}' OR
              soss.status = '${storeOrderStatusName.CANCELED}') THEN true ELSE false END AS is_past
      from store_order_sets sos
      left join store_order_set_statuses soss on soss.id = (
        SELECT id FROM   store_order_set_statuses WHERE  store_order_set_statuses.store_order_set_id = sos.id ORDER  BY created desc LIMIT  1)
      left join store_orders so on so.store_order_set_id = sos.id
      where sos.customer_id = ?
      and sos.country_id = ?
      and soss.status not in ('${storeOrderStatusName.INITIATED}')
      and sos.created >= ?
      and sos.created <= ?
      order by sos.created desc`,
      [customerId, countryId, toDateWithTZ(startDate, 'start'), toDateWithTZ(endDate, 'end')]
      ).then(result => transformToCamelCase(result.rows));
    const getFormattedData = (_storeOrders) => {
      const newData = {};
      _storeOrders.forEach(so => {
        if (newData[so.id]) {
          newData[so.id] = {
            ...newData[so.id],
            storeOrderId: [...newData[so.id].storeOrderId, so.storeOrderId],
            brandId: [...newData[so.id].brandId, so.brandId],
          };
        } else {
          newData[so.id] = {
            ...so,
            storeOrderId: [so.storeOrderId],
            brandId: [so.brandId],
          };
        }
      });
      const arr = [];
      for (const value of Object.values(newData)) {
        arr.push(value);
      }
      return arr;
    };
    storeOrders = getFormattedData(storeOrders);
    let brandIds = [];
    storeOrders.map(storeOrder => {
      brandIds.push(...storeOrder.brandId);
    });
    brandIds = [...new Set(brandIds)];
    const brandList = await this.roDb('brands')
      .select(
        'id as brand_id',
        'name as brand_name',
        'name_ar as brand_name_ar',
        'name_tr as brand_name_tr',
        'favicon'
      )
      .whereIn('id', brandIds);
    storeOrders = storeOrders.map(storeOrder => {
      const brands = [];
      storeOrder.brandId.map(_brand => {
        const brand = find(brandList, { brandId: _brand });
        brands.push(brand);
        addLocalizationField(brand, 'brandName');
      });
      delete storeOrder.brandId;
      delete storeOrder.storeOrderId;
      storeOrder.brands = brands;
      return storeOrder;
    });
    return this.paginator(storeOrders, paging.pageNo, paging.perPage);
  }

  paginator(items, currentPage, perPageItems) {
    const page = currentPage || 1;
    const perPage = perPageItems || 20;
    const offset = (page - 1) * perPage;

    const paginatedItems = items.slice(offset).slice(0, perPageItems);
    const totalPages = Math.ceil(items.length / perPage);

    return {
      paging: {
        page,
        perPage,
        prePage: page - 1 ? page - 1 : null,
        nextPage: (totalPages > page) ? page + 1 : null,
        total: items.length,
        totalPages,
      },
      results: paginatedItems,
    };
  }
}

module.exports = StoreOrderSet;
