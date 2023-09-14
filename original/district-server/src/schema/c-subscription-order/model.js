/* eslint-disable camelcase */
const BaseModel = require('../../base-model');
const { generateShortCode, cloneObject, addLocalizationField, jsonToObject, formatError, addPaging
} = require('../../lib/util');
const {
  cSubscriptionOrderCreateError,
  cSubscriptionOrderStatus,
} = require('./enum');
const { pick, get, find } = require('lodash');
const {
  // notifications: {
  //   emailAddresses: { receipts },
  // },
  order: orderConfig,
  invoice,
} = require('../../../config');
const Money = require('../../lib/currency');
const {
  invoiceComponentType,
  paymentStatusName,
  paymentStatusOrderType,
  transactionAction,
  transactionType,
  orderSetSource,
  orderCouponTypes,
  firstOrdersType,
  couponValidationError,
  promoType,
  couponType,
  couponDetailUsedOn,
  customerAnalyticsEvents,
} = require('../root/enums');
const { notificationCategories } = require('../../lib/notifications');
const { cSubscriptionStatus } = require('../c-subscription/enum');
const { paymentSchemes, paymentProviders } = require('../../payment-service/enums');
const { convertLegacyPaymentMethod } = require('../order-payment-method/utils');
const { cSubscriptionActionType, cSubscriptionReferenceOrderType } = require('../c-subscription-customer-transaction/enum');
const { cSubscriptionCustomerStatus } = require('../c-subscription-customer/enum');
const { triggerSubscriptionInvoiceGenerator } = require('../../lib/e-invoice/invoice-trigger-subscription');
const { getObjectPresignedURL } = require('../../lib/aws-s3');
const moment = require('moment/moment');
const { publishEvent } = require('../../lib/event-publisher');
const { Topic } = require('../../lib/event-publisher/enums');
// const { renderConfirmationEmail } = require('./email-confirmation-renderer');
const subscriptionConfig = require('../../../config').cSubscription;

class CSubscriptionOrder extends BaseModel {
  constructor(db, context) {
    super(db, 'subscription_orders', context);
  }

  async getUniqueShortCode() {
    const shortCode = generateShortCode();
    const [order] = await this.getByShortCode(shortCode);
    if (!order) {
      return shortCode;
    }
    return this.getUniqueShortCode();
  }

  async getByShortCode(shortCode) {
    return this.db(this.tableName).where('short_code', shortCode.toUpperCase());
  }

  async validateOrderAgain(subscriptionCustomerId) {
    const errors = [];
    const customerId = this.context.auth.id;
    const subscriptionCustomer = await this.context.cSubscriptionCustomer.getById(subscriptionCustomerId);
    if (subscriptionCustomer) {
      if (customerId === subscriptionCustomer.customerId) {
        const subs = await this.context.cSubscription.getById(subscriptionCustomer.subscriptionId);
        if (subs.status === cSubscriptionStatus.ACTIVE) {
          const latestSubscriptionCustomer = await this.context.cSubscriptionCustomer.getByCustomerIdAndSubscriptionId(subscriptionCustomer.customerId, subscriptionCustomer.subscriptionId);
          if (latestSubscriptionCustomer.status === cSubscriptionCustomerStatus.ACTIVE) {
            errors.push(cSubscriptionOrderCreateError.ALREADY_EXIST_SUBSCRIPTION);
          }
        } else errors.push(cSubscriptionOrderCreateError.INVALID_SUBSCRIPTION);
      } else errors.push(cSubscriptionOrderCreateError.INVALID_CUSTOMER);
    } else errors.push(cSubscriptionOrderCreateError.INVALID_SUBSCRIPTION_CUSTOMER);
    return errors;
  }

  async createSubscriptionOrderDeeplink(subscriptionCustomerId) {
    const subscriptionCustomer = await this.context.cSubscriptionCustomer.getById(subscriptionCustomerId);
    return { subscriptionId: subscriptionCustomer.subscriptionId };
  }

  async validateOrder(input, fromOrder = true) {
    const errors = [];
    const { customerId, item, paymentMethod, useCredits, autoRenewal, couponId } = input;

    if (fromOrder && autoRenewal) {
      if (
        useCredits
        || !paymentMethod
        || paymentMethod.paymentScheme !== paymentSchemes.SAVED_CARD
      ) {
        errors.push(
          cSubscriptionOrderCreateError.PAYMENT_METHOD_INVALID_FOR_AUTO_RENEWAL
        );
        return errors;
      }
      const customerCardToken = await this.context.customerCardToken.getById(
        paymentMethod.sourceId
      );
      if (
        !this.context.customerCardToken.isUsableForAutoRenewal(
          customerCardToken
        )
      ) {
        errors.push(
          cSubscriptionOrderCreateError.PAYMENT_METHOD_INVALID_FOR_AUTO_RENEWAL
        );
        return errors;
      }
    }
    if (paymentMethod && paymentMethod.paymentScheme === paymentSchemes.CASH) {
      errors.push(cSubscriptionOrderCreateError.CASH_NOT_AVAILABLE);
      return errors;
    }
    let subscription;
    if (!item) {
      errors.push(cSubscriptionOrderCreateError.INVALID_ITEM);
      return errors;
    } else {
      if (!item.subscriptionId) {
        errors.push(cSubscriptionOrderCreateError.INVALID_SUBSCRIPTION);
        return errors;
      } else {
        subscription = await this.context.cSubscription.getById(item.subscriptionId);
        if (!subscription) {
          errors.push(cSubscriptionOrderCreateError.INVALID_SUBSCRIPTION);
          return errors;
        } else {
          const subsAvailable = await this.context.cSubscription.isSubscriptionEnableByCountryId(subscription.countryId);
          if (!subsAvailable) {
            errors.push(cSubscriptionOrderCreateError.INVALID_SUBSCRIPTION);
            return errors;
          }
          if (subscription.status !== cSubscriptionStatus.ACTIVE) {
            errors.push(cSubscriptionOrderCreateError.INVALID_SUBSCRIPTION);
            return errors;
          }
          const customerSubs = await this.context.cSubscriptionCustomer.getByCustomerIdAndSubscriptionId(customerId, subscription.id);
          if (customerSubs && customerSubs.status == cSubscriptionCustomerStatus.ACTIVE) {
            errors.push(cSubscriptionOrderCreateError.ALREADY_EXIST_SUBSCRIPTION);
          }
        }
      }
    }
    /*if (fromOrder) {
      // TODO remove this if
      const lastActiveSubscription = await this.context.cSubscriptionCustomer.getLastActiveSubscriptionId(customerId, subscription.countryId);
      if (lastActiveSubscription) {
        errors.push(cSubscriptionOrderCreateError.ALREADY_EXIST_SUBSCRIPTION);
        return errors;
      }
    }*/
    if (couponId) {
      const isCouponAvailableForSubscriptionVal = await this.isCouponAvailableForSubscription({
        customerId,
        couponId,
        countryId: subscription.countryId,
        subscriptionId: subscription.id
      });
      if (isCouponAvailableForSubscriptionVal && !isCouponAvailableForSubscriptionVal.status) {
        errors.push(isCouponAvailableForSubscriptionVal.error);
      }
    }
    return errors;
  }

  async create(input) {
    // pricing calculation
    const {
      subscription,
      currency,
      country,
      components,
      couponDetails,
    } = await this.getPricingCalculation(input);

    const subTotal = find(components, c => c.type === invoiceComponentType.SUBTOTAL);
    const total = find(components, c => c.type === invoiceComponentType.TOTAL);
    const amountDue = find(components, c => c.type === invoiceComponentType.AMOUNT_DUE);
    const usedCredits = find(components, c => c.type === invoiceComponentType.CREDITS);
    const couponComponent = find(components, c => c.type === invoiceComponentType.VOUCHER);

    // If the payment method is not empty even though
    // the payment is completed with credits, we need
    // to set the value to null to make payment method
    // is INTERNAL in the payment method detection
    if (input.useCredits && Number(amountDue.value) === 0) {
      input.paymentMethod = null;
    }

    const { paymentMethod } = input;
    const subscriptionOrder = pick(input, [
      'customerId',
      'src',
      'srcPlatform',
      'srcPlatformVersion',
    ]);
    subscriptionOrder.receiptUrl = orderConfig.receiptUrl;
    subscriptionOrder.errorUrl = orderConfig.errorUrl;
    const useCredits = get(input, 'useCredits', false);

    // get customer card token
    let customerCardTokenSnapshot = null;
    const {
      paymentProvider,
      customerCardToken,
    } = await this.context.paymentService.detectPaymentProviderViaPaymentMethod(
      input.paymentMethod,
    );
    if (customerCardToken) {
      customerCardTokenSnapshot = cloneObject(customerCardToken);
      delete customerCardTokenSnapshot.providerRaw;
    }

    subscriptionOrder.paymentProvider = paymentProvider;
    subscriptionOrder.paymentMethod = input.paymentMethod
      ? input.paymentMethod.paymentScheme
      : null;

    const customer = await this.context.customer.getById(
      subscriptionOrder.customerId,
    );

    if ((!paymentProvider || !paymentMethod) && Number(amountDue.value) > 0) {
      await this.context.kinesisLogger.sendLogEvent(
        {
          rawSubscriptionOrderInput: input,
          customer,
          subscription,
          currency,
          components,
          country,
          amountDue: amountDue.value,
          paymentProvider,
          paymentMethod,
          errorReason:
            'No Payment provider/method is given and ammount due is non-negative',
        },
        'subscription-order-create-error',
      );
      return {
        error: [cSubscriptionOrderCreateError.PAYMENT_METHOD_REQUIRED],
      };
    }

    // default subscriptionOrderStatus
    let subscriptionOrderStatus = cSubscriptionOrderStatus.INITIATED;

    subscriptionOrder.shortCode = await this.getUniqueShortCode();
    const subscriptionOrderId = await this.save({
      ...subscriptionOrder,
      subscriptionId: subscription.id,
      currencyId: currency.id,
      countryId: country ? country.id : null,
      paymentMethod: paymentMethod ? paymentMethod.paymentScheme || null : null,
      paymentProvider,
      total: total.value,
      subTotal: subTotal.value,
      //fee: fee.value,
      vat: country.vat,
      totalVat: country.vat,
      amountDue: amountDue.value,
      status: subscriptionOrderStatus,
      couponId: couponComponent ? input.couponId : null,
    });
    publishEvent(Topic.ANALYTICS_EVENTS,
      {
        eventType: customerAnalyticsEvents.SUBSCRIPTION_PURCHASE_COUNT,
        orderType: paymentStatusOrderType.SUBSCRIPTION_ORDER,
        referenceOrderId: subscriptionOrderId,
        customerId: customer.id,
      },
      this.context
    ).catch(err => console.error(err));

    this.context.kinesisLogger.sendLogEvent({
      subscriptionOrderId,
      components,
    }, 'subscriptionOrder-create-component')
      .catch(e => console.log('subscriptionOrder-create-component-log-error', e));

    if (couponComponent) {
      const usedCouponDetails = [];
      if (couponDetails && couponDetails.length > 0) {
        const couponDetail = couponDetails[0];
        usedCouponDetails.push({
          usedOn: couponDetailUsedOn.SUBSCRIPTION_ORDER,
          referenceId: subscriptionOrderId,
          couponId: couponDetail.couponId,
          type: couponDetail.type,
          amount: couponDetail.amount,
        });
      }
      if (usedCouponDetails.length > 0) {
        await this.context.usedCouponDetail.save(usedCouponDetails);
        publishEvent(Topic.ANALYTICS_EVENTS,
          {
            eventType: customerAnalyticsEvents.SUBSCRIPTION_VOUCHER_USED_COUNT,
            orderType: paymentStatusOrderType.SUBSCRIPTION_ORDER,
            referenceOrderId: subscriptionOrderId,
            customerId: customer.id,
          },
          this.context
        ).catch(err => console.error(err));
      }
    }

    // default payment status
    let paymentStatus = paymentStatusName.PAYMENT_PENDING;

    // default payment url
    let paymentUrl = null;
    // default payment response
    let paymentRawResponse = '{}';
    let debitCreditsAndGiftCardNow = true;
    if (Number(total.value) > 0) {
      // We are paying with customer credit balance
      if (paymentProvider && paymentMethod && Number(amountDue.value) > 0) {
        debitCreditsAndGiftCardNow = false;

        // save order payment method
        await this.context.orderPaymentMethod.save({
          orderType: paymentStatusOrderType.SUBSCRIPTION_ORDER,
          referenceOrderId: subscriptionOrderId,
          paymentProvider,
          paymentMethod,
        });

        const sourceListToDisable3ds = [orderSetSource.SIRI];
        const isEnabled3ds = sourceListToDisable3ds && subscriptionOrder.src
          ? !sourceListToDisable3ds.includes(subscriptionOrder.src)
          : true;
        const psResponse = await this.context.paymentService.pay({
          language: customer.preferedLanguage,
          currencyCode: currency.isoCode,
          countryCode: country.isoCode,
          countryId: country.id,
          amount: Number(amountDue.value),
          paymentMethod,
          referenceOrderId: subscriptionOrderId,
          orderType: paymentStatusOrderType.SUBSCRIPTION_ORDER,
          customerId: customer.id,
          customerPhoneNumber: customer.phoneNumber,
          isEnabled3ds,
          subscription: {
            autoRenewal: input.autoRenewal,
            subscriptionCustomerAutoRenewalId:
              input.subscriptionCustomerAutoRenewalId,
            initialOrder: input.initialOrder,
            previousPaymentId: input.previousPaymentId,
          },
        });

        if (psResponse.error) {
          paymentStatus = paymentStatusName.PAYMENT_FAILURE;
          subscriptionOrderStatus = cSubscriptionOrderStatus.FAILED;
          await this.paymentServiceFailProcess(paymentStatus, subscriptionOrderStatus, subscriptionOrderId, psResponse);

          return {
            error: [cSubscriptionOrderCreateError.MERCHANT_INITIALIZATION_ERROR],
            paymentStatus,
          };
        }
        await this.save({
          id: subscriptionOrderId,
          merchantId: psResponse.id,
        });
        paymentUrl = psResponse.paymentUrl;
        paymentRawResponse = psResponse.rawResponse;
        if (psResponse.approved) {
          subscriptionOrderStatus = cSubscriptionOrderStatus.COMPLETED;
          paymentStatus = paymentStatusName.PAYMENT_SUCCESS;
          await this.save({
            id: subscriptionOrderId,
            status: subscriptionOrderStatus,
            paid: true,
            amountDue: 0.0,
          });
          amountDue.value = this.newCurrencyValue(currency, 0.0);
          debitCreditsAndGiftCardNow = true;
        }
      } else {
        debitCreditsAndGiftCardNow = true;
      }
    } else {
      debitCreditsAndGiftCardNow = true;
      // won't happen ever
      subscriptionOrderStatus = cSubscriptionOrderStatus.COMPLETED;
      paymentStatus = paymentStatusName.PAYMENT_SUCCESS;
      paymentRawResponse = '{"total": 0}';
      // mark order set true as the its paid by credits
      await this.save({
        id: subscriptionOrderId,
        status: subscriptionOrderStatus,
        paid: true,
      });
    }
    // subscription prepaid credits and giftcards
    await this.save({
      id: subscriptionOrderId,
      creditsUsed: !!usedCredits,
      prePaid: this.getPrePaid(usedCredits ? Number(usedCredits.value) : 0),
    });
    if (debitCreditsAndGiftCardNow) {
      if (useCredits && usedCredits && Number(usedCredits.value) > 0) {
        await this.context.loyaltyTransaction.debit(
          subscriptionOrderId,
          paymentStatusOrderType.SUBSCRIPTION_ORDER,
          subscriptionOrder.customerId,
          Number(usedCredits.value),
          currency.id,
        );
        paymentStatus = paymentStatusName.PAYMENT_SUCCESS;
        paymentRawResponse = `{"isCredits": true, "paid": true, "creditsUsed": ${usedCredits.value}, "total": ${total.value}}`;
      }
      // mark order set true as the its paid by credits
      if (Number(amountDue.value) === 0) {
        subscriptionOrderStatus = cSubscriptionOrderStatus.COMPLETED;
        await this.save({
          id: subscriptionOrderId,
          status: subscriptionOrderStatus,
          paid: true,
          amountDue: 0.0,
        });

        await this.context.transaction.save({
          referenceOrderId: subscriptionOrderId,
          orderType: paymentStatusOrderType.SUBSCRIPTION_ORDER,
          action: transactionAction.ORDER,
          type: transactionType.DEBITED,
          customerId: subscriptionOrder.customerId,
          currencyId: currency.id,
          amount: Number(total.value) - Number(amountDue.value),
        });
      }
    }
    let newPaymentProvider = paymentProvider;
    const newPaymentMethod = paymentMethod ? paymentMethod.paymentScheme : null;
    if (!paymentMethod && useCredits) {
      newPaymentProvider = paymentProviders.INTERNAL;
    }
    // Insert Initial Payment Status
    await this.context.paymentStatus.save({
      referenceOrderId: subscriptionOrderId,
      orderType: paymentStatusOrderType.SUBSCRIPTION_ORDER,
      name: paymentStatus,
      rawResponse: paymentRawResponse,
      paymentProvider: newPaymentProvider,
      countryIso: country.isoCode,
      paymentMethod: newPaymentMethod,
    });

    const savedSubscriptionOrder = await this.getById(subscriptionOrderId);

    await this.context.kinesisLogger.sendLogEvent(
      {
        debitCreditsAndGiftCardNow,
        rawSubscriptionOrderInput: input,
        customer,
        countryIso: country.isoCode,
        subscriptionOrder: savedSubscriptionOrder,
        paymentUrl,
        paymentStatus,
        paymentMethod,
        rawPaymentResponse: paymentRawResponse,
        orderDetails: {
          subscription,
          currency,
          components,
        },
      },
      'subscription-order-create-success',
    );

    return {
      subscriptionOrder: savedSubscriptionOrder,
      paymentUrl,
      paymentStatus,
      paymentMethod,
      rawPaymentResponse: paymentRawResponse,
    };
  }

  async paymentServiceFailProcess(paymentStatus, subscriptionOrderStatus, subscriptionOrderId, psResponse) {
    await this.save({
      id: subscriptionOrderId,
      status: subscriptionOrderStatus,
    });

    await this.context.paymentStatus.save({
      referenceOrderId: subscriptionOrderId,
      orderType: paymentStatusOrderType.SUBSCRIPTION_ORDER,
      name: paymentStatus,
      rawResponse: psResponse.error,
    });

    await this.context.kinesisLogger.sendLogEvent(
      {
        referenceOrderId: subscriptionOrderId,
        orderType: paymentStatusOrderType.SUBSCRIPTION_ORDER,
        name: paymentStatus,
        subscriptionOrderPaymentError: psResponse,
        errorReason: 'Payment Service Error',
      },
      'subscription-order-create-error',
    );
    return { paymentStatus, subscriptionOrderStatus };
  }

  async createSubscriptionUsageEntities(input, result) {
    if (input.couponId) {
      delete input.couponId;
    }
    const validationResult = await this.context.cSubscriptionOrder.validateOrder(input);
    if (validationResult.length > 0) {
      await this.context.kinesisLogger.sendLogEvent(
        { input, result, validationResult },
        'subscription-create-usage-entities-fail',
      );
      return;
    }

    const { customerId, item: { subscriptionId } } = input;
    const { subscriptionOrder } = result;
    const subscription = await this.context.cSubscription.getById(subscriptionId);
    const country = await this.context.country.getById(subscription.countryId);

    const subscriptionCustomerAutoRenewal = {
      customerId,
      subscriptionId,
      paymentProvider: subscriptionOrder.paymentProvider,
      rawPaymentResponse: result.rawPaymentResponse,
      countryCode: country.isoCode,
    };
    const subscriptionCustomerAutoRenewalId = await this.context
      .cSubscriptionCustomerAutoRenewal
      .createOrUpdateAutoRenewal(subscriptionCustomerAutoRenewal);
    await this.context.kinesisLogger.sendLogEvent(
      subscriptionCustomerAutoRenewal,
      'subscription-customer-auto-renewal-create-success',
    );

    const subscriptionCustomer = {
      subscriptionId: subscription.id,
      customerId,
      currencyId: subscription.currencyId,
      countryId: subscription.countryId,
      subscriptionOrderId: subscriptionOrder.id,
      price: subscription.price,
      totalCupsCount: subscription.totalCupsCount,
      perDayCupsCount: subscription.perDayCupsCount,
      perOrderMaxCupsCount: subscription.perOrderMaxCupsCount,
      period: subscription.period,
      status: cSubscriptionCustomerStatus.ACTIVE,
      periodInMinutes: subscription.periodInMinutes,
      brandId: subscription.brandId,
      subscriptionCustomerAutoRenewalId
    };

    const subscriptionCustomerId = await this.context.cSubscriptionCustomer.save(subscriptionCustomer);

    await this.context.kinesisLogger.sendLogEvent(
      subscriptionCustomer,
      'subscription-customer-create-success',
    );

    const subscriptionCustomerTransaction = {
      subscriptionCustomerId,
      actionType: cSubscriptionActionType.STARTED,
      remainingCups: subscription.totalCupsCount,
      remainingMinutes: subscription.periodInMinutes,
      credit: subscription.totalCupsCount,
      debit: 0,
      referenceOrderType: cSubscriptionReferenceOrderType.SUBSCRIPTION_ORDER,
      referenceOrderId: subscriptionOrder.id,
      subscriptionId: subscription.id,
      customerId,
      currencyId: subscription.currencyId,
      countryId: subscription.countryId,
      brandId: subscription.brandId,
      branchId: null,
    };

    await this.context.cSubscriptionCustomerTransaction.save(subscriptionCustomerTransaction);
    await this.createSlackMessage({ customerId, subscription });
    await this.context.kinesisLogger.sendLogEvent(
      subscriptionCustomerTransaction,
      'subscription-customer-transaction-create-success',
    );
    const brand = await this.context.brand.getById(subscription.brandId);
    const subscriptionCustomersWithBrands = await this.context
      .cSubscriptionCustomer
      .getAllActiveSubscriptionsWithBrands(customerId);
    this.sendItToSqs(
      'analytics',
      {
        analyticsProvider: 'BRAZE',
        data: {
          events: [
            {
              'external_id': customerId,
              name: 'subscription_coffeeshop',
              time: new Date().toISOString(),
              properties: {
                brandId: brand.id,
              }
            }
          ],
          attributes: [
            {
              'external_id': customerId,
              'subscription_brand': [
                ...subscriptionCustomersWithBrands.reduce((result, {brand}) => {
                  result.add(brand.name);
                  return result;
                }, new Set())
              ],
            },
            {
              'external_id': customerId,
              'subscription_expirydate': moment.max(
                subscriptionCustomersWithBrands.map(
                  subscriptionCustomer => moment(subscriptionCustomer.created)
                    .add(subscription.periodInMinutes, 'minutes')
                )
              ),
            }
          ]
        }
      }
    ).catch(err => console.error(err));
    return { subscriptionCustomerId };
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

  async getSubscriptionsWithPrice(item) {
    const subscription = await this.context.cSubscription.getById(item.subscriptionId);
    const [country, currency] = await Promise.all([
      this.context.country.getById(subscription.countryId),
      this.context.currency.getById(subscription.currencyId),
    ]);
    const totalPrice = new Money(
      subscription.price,
      currency.decimalPlace,
      currency.lowestDenomination,
    ).toCurrencyValue();
    return {
      currency,
      country,
      subscription: {
        ...subscription,
        totalPrice,
      },
    };
  }

  async calculatePrice(subscription, currency) {
    let subTotal = new Money(
      0,
      currency.decimalPlace,
      currency.lowestDenomination,
    );
    subTotal = subTotal.add(subscription.totalPrice);
    return {
      subTotal: subTotal.toCurrencyValue(),
    };
  }

  newCurrencyValue(currency, amount) {
    return new Money(
      amount,
      currency.decimalPlace,
      currency.lowestDenomination,
    ).toCurrencyValue();
  }

  async getPricingCalculation(input) {
    const { customerId, couponId } = input;
    const useCredits = get(input, 'useCredits', false);

    const { subscription, currency, country } = await this.getSubscriptionsWithPrice(input.item);
    const calculation = await this.calculatePrice(subscription, currency);

    //*** coupon calculation ***//
    let subtotalWithAllDiscounts = this.getMoney(Math.max(calculation.subTotal, 0), currency);
    let couponAmount, couponDiscount, couponDetails, coupon;
    if (couponId) {
      const customer = await this.context.customer.getById(customerId);
      coupon = await this.context.coupon.getAvailableCouponForAuthCustomer(couponId, customer.email, orderCouponTypes.SUBSCRIPTION_ORDER);
      couponDetails = await this.context.couponDetail.getAllByCoupon(couponId);

      couponDiscount = await this.getCouponDiscount({
        customerId: customer.id,
        coupon,
        costReductionPerk: this.getCostReductionPerk(couponDetails),
        currency,
        perksAmount: 0,
        subtotal: calculation.subTotal,
        useCredits,
      });
      couponAmount = this.getMoney(couponDiscount.amount, currency);
      subtotalWithAllDiscounts = this.getMoney(Math.max(calculation.subTotal - couponAmount.round().value, 0), currency);
    }
    //*** coupon calculation ***//

    calculation.total = new Money(
      subtotalWithAllDiscounts.value,
      currency.decimalPlace,
      currency.lowestDenomination,
    ).toCurrencyValue();

    calculation.amountDue = calculation.total;

    let creditsUsed = 0.0;

    if (useCredits) {
      const customerBalance = await this.context.loyaltyTransaction.getBalanceByCustomer(
        customerId,
        currency.id,
      );
      creditsUsed = await this.calculateCredit(
        customerBalance,
        calculation.total,
      );
      calculation.amountDue = await this.calculateAmountDue(
        customerBalance,
        calculation.total,
      );
    }

    const components = [
      {
        type: invoiceComponentType.TOTAL,
        value: this.newCurrencyValue(currency, calculation.total),
      },
      {
        type: invoiceComponentType.SUBTOTAL,
        value: this.newCurrencyValue(currency, calculation.subTotal),
      },
      {
        type: invoiceComponentType.AMOUNT_DUE,
        value: this.newCurrencyValue(currency, calculation.amountDue),
      },
    ];

    if (couponId && couponDiscount && couponDiscount.amount > 0) {
      components.push({
        type: invoiceComponentType.VOUCHER,
        value: this.newCurrencyValue(currency, couponAmount.round().value),
      });
    }

    if (creditsUsed > 0) {
      components.push({
        type: invoiceComponentType.CREDITS,
        value: this.newCurrencyValue(currency, creditsUsed),
      });
    }
    return {
      components,
      subscription,
      country,
      coupon,
      couponDetails,
      currency: addLocalizationField(
        addLocalizationField(currency, 'symbol'),
        'subunitName',
      ),
    };
  }

  async sendPaymentStatusChangeNotifications(
    subscriptionOrderId,
    paymentStatusName,
    knetResponse
  ) {
    const notifications = await this.paymentStatusChangeNotifications(
      subscriptionOrderId,
      paymentStatusName,
      knetResponse,
      this.context
    );
    return this.context.notification.createAllIn(notifications);
  }

  async paymentStatusChangeNotifications(
    subscriptionOrderId,
    paymentStatusName,
    knetResponse,
    context,
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

    // TODO: When Email template is ready, enable following code
    // For now returning empty set
    // Check line 12 and 34
    return Promise.resolve(emptySet);
    /*
    const rendering = await renderConfirmationEmail(
      context,
      subscriptionOrderId,
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
      rendering,
    );
    const result = {
      push: [],
      email: [emailArgs],
    };
    return Promise.resolve(result);
    */
  }

  async resolvePaymentCallback(psResponse) {
    const { referenceOrderId, paymentStatus, rawResponse } = psResponse;
    const order = await this.getById(referenceOrderId);
    if (!order) {
      return formatError([`order ${referenceOrderId} not found`]);
    }
    try {
      const res = await this.context.withTransaction(
        'cSubscriptionOrder',
        'debitAndProcessPayment',
        order,
        paymentStatus,
        rawResponse,
      );
      if (res) {
        //TODO:
      }
    } catch (err) {
      const errObj = {
        psResponse,
        err: err?.message,
      };
      this.context.kinesisLogger.sendLogEvent(
        errObj,
        'subscription-order-resolvePaymentCallback-error',
      );
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

  async debitAndProcessPayment(order, paymentStatus, rawResponse) {
    const [
      currentPaymentStatus,
    ] = await this.context.paymentStatus.getAllBySubscriptionOrderId(order.id);

    const newPaymentStatus = {
      referenceOrderId: order.id,
      orderType: paymentStatusOrderType.SUBSCRIPTION_ORDER,
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
              paymentStatusOrderType.SUBSCRIPTION_ORDER,
              order.customerId,
              Number(prePaid.creditsUsed),
              order.currencyId
            );
          }
        }
        // mark paid
        await this.save({
          id: order.id,
          paid: true,
          amountDue: 0.0,
          status: cSubscriptionOrderStatus.COMPLETED,
        });

        await this.context.paymentStatus.save(newPaymentStatus);

        // add payment transaction
        await this.context.transaction.save({
          referenceOrderId: order.id,
          action: transactionAction.ORDER,
          orderType: paymentStatusOrderType.SUBSCRIPTION_ORDER,
          type: transactionType.DEBITED,
          customerId: order.customerId,
          currencyId: order.currencyId,
          amount: order.total,
        });
      }
    } else {
      await this.save({
        id: order.id,
        paid: false,
        status: cSubscriptionOrderStatus.FAILED,
      });
      await this.context.paymentStatus.save(newPaymentStatus);
    }

    const input = {
      customerId: order.customerId,
      item: { subscriptionId: order.subscriptionId }
    };
    const result = {
      subscriptionOrder: order,
      rawPaymentResponse: rawResponse
    };
    switch (paymentStatus) {
      case paymentStatusName.PAYMENT_SUCCESS:
        await this.paymentSuccess(input, result);
        await this.db('successful_payment_transactions').insert({
          referenceOrderId: order.id
        });
        return true;
      case paymentStatusName.PAYMENT_FAILURE:
        await this.paymentFailed(input, result);
        return false;
      default:
        return false;
    }
  }

  async getPaymentMethod({ id }) {
    const orderPaymentMethod = await this.context.orderPaymentMethod.getSubscriptionOrderPaymentMethod(
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
      if (paymentMethod.paymentScheme === paymentSchemes.SAVED_CARD) {
        if (paymentMethod.sourceId) {
          if (paymentMethod?.name === undefined) {
            const customerCardToken = await this.context.customerCardToken.getById(paymentMethod.sourceId);
            const { scheme } = customerCardToken;
            paymentMethod.name = {
              en: scheme,
              ar: scheme,
              tr: scheme,
            };
          }
        }
      }
      return paymentMethod;
    } else if (paymentMethod.id) {
      return convertLegacyPaymentMethod(paymentMethod);
    }

    return null;
  }

  async paymentSuccess(input, result) {
    const res = await this.createSubscriptionUsageEntities(input, result);
    if (!res?.subscriptionCustomerId) {
      return null;
    }
    const { subscriptionCustomerId } = res;
    this.context.cSubscriptionCustomer.sendNotification(
      subscriptionCustomerId,
      input.autoRenewal && !input.initialOrder
        ? notificationCategories.SUBSCRIPTION_AUTO_RENEWAL_PURCHASE_SUCCESS
        : notificationCategories.SUBSCRIPTION_PURCHASE
    ).catch(err => console.log(err));
    const { couponId, customerId } = result?.subscriptionOrder;
    try {
      if (couponId && customerId) {
        await this.context.coupon.incrementCouponCountersForCustomer(couponId, customerId, 1);
      }
    } catch (err) {
      const { name, stack, message } = err || {};
      this.logIt({
        eventType: 'subscriptionOrder-paymentSuccess-coupon-redeem-error',
        eventObject: { subscriptionCustomerId, couponId, customerId, name, stack, message },
      }).catch(e => console.log(e));
    }
    // TODO: If payment is success, use this
    if (result.subscriptionOrder.id) {
      const allowedIsoCodeInvoice = ['SA', 'AE', 'KW'];
      const subscription = await this.context.cSubscription.getById(result.subscriptionOrder.subscriptionId);
      const country = await this.context.country.getById(subscription?.countryId);
      const subscriptionEnable = await this.context.cSubscription.isSubscriptionEnableByCountryId(subscription?.countryId);
      if (
        result.subscriptionOrder &&
        country &&
        allowedIsoCodeInvoice.includes(country.isoCode) &&
        subscriptionEnable
      ) {
        await triggerSubscriptionInvoiceGenerator(this.context, result.subscriptionOrder.id);
      }
    }

  }

  async paymentFailed(input, result) {
    // TODO: If payment is failed, use this
  }

  async getSubscriptionOrderInvoiceURL({ id, countryId }) {
    if (countryId) {
      const country = await this.context.country.getById(countryId);
      if (country) {
        const cfg = invoice.subscriptionOrder[country.isoCode];
        if (cfg) {
          const subscriptionOrder = await this.getById(id);
          if (subscriptionOrder && subscriptionOrder.shortCode) {
            const fullKey = `${cfg.folderPath}/INV-${subscriptionOrder.shortCode}.pdf`;
            const url = await getObjectPresignedURL(cfg.bucket, fullKey, cfg.signedUrlExpireSeconds);
            return url;
          }
        }
      }
    }
    return null;
  }

  getQueryByFilters(filters, paging) {
    let query = this.db(this.tableName)
      .orderBy('created', 'desc');
    if (filters) {
      query = query.where(filters);
    }
    if (paging) {
      query = addPaging(query, paging);
    }
    return query;
  }

  async getSubscriptionOrderByCustomerId(customerId, countryId) {
    const query = this.db(this.tableName).where('customer_id', customerId);
    if (countryId) query.where('country_id', countryId);
    query.orderBy('created', 'desc');
    return await query;
  }


  async createSlackMessage({ customerId, subscription }) {
    const [brand, customer, country] = await Promise.all([this.context.brand.getById(subscription.brandId), this.context.customer.getById(customerId), this.context.country.getById(subscription.countryId)]);
    const subscriptionWebhookUrl = subscriptionConfig.countryUrls[country.isoCode];
    return this.alertIt({
      text: `New Subscriber
Customer: ${customer.firstName + ' ' + customer.lastName}
Brand: ${brand.name}
Subscription: ${subscription.name.en}
Price: ${subscription.price}
Total Cups Count: ${subscription.totalCupsCount}
Per Day Cups Count: ${subscription.perDayCupsCount}
Per Order Max Cups Count: ${subscription.perOrderMaxCupsCount}`, object: null, image: null, path: subscriptionWebhookUrl
    });
  }

  async isCouponAvailableForSubscription({ customerId, couponId, subscriptionId, countryId }) {
    const [
      { email, referralCode },
      country,
      subscription
    ] = await Promise.all([
      this.context.customer.getById(customerId),
      this.context.country.getById(countryId),
      this.context.cSubscription.getById(subscriptionId)
    ]);
    const coupon = await this.context.coupon.getAvailableCouponForAuthCustomer(couponId, email, orderCouponTypes.SUBSCRIPTION_ORDER);
    if (!coupon) {
      return { status: false, error: cSubscriptionOrderCreateError.INVALID_COUPON };
    }

    if (coupon && coupon.type !== promoType.REGULAR) {
      // Only regular order is usable
      return { status: false, error: cSubscriptionOrderCreateError.INVALID_COUPON_PROMO_TYPE };
    }

    if (
      !coupon ||
      (coupon.referralCoupon && !country.isReferralActive)
    ) {
      return { status: false, error: cSubscriptionOrderCreateError.INVALID_COUPON };
    }
    if (
      coupon.onlyFirstOrders &&
      coupon.customerRedemptionLimit > 0
    ) {
      if (referralCode === coupon.couponCode) {
        return { status: false, error: cSubscriptionOrderCreateError.INVALID_COUPON_REFERRAL_CODE_CAN_NOT_BE_SAME_COUPON_CODE };
      }

      const stats = await this.customerSubscriptionOrderStatsByCoupon({ customerId });
      if (stats.totalOrders >= coupon.customerRedemptionLimit) {
        return { status: false, error: cSubscriptionOrderCreateError.INVALID_COUPON_CUSTOMER_REDEMPTION_LIMIT_EXCEEDED };
      }

      // const customerStats = await this.context.customerStats.getByCustomer(customerId);
      // if (customerStats.totalOrders >= coupon.customerRedemptionLimit) {
      //   return false;
      // }
    }
    if (
      !(await this.context.coupon.isCouponAvailableForBrandByBrandId(subscription.brandId, couponId))
    ) {
      return { status: false, error: cSubscriptionOrderCreateError.INAPPLICABLE_VENDOR_FOR_COUPON };
    }

    if (
      coupon.customerGroupId &&
      !(await this.context.coupon.isValidForCustomerGroup(coupon.customerGroupId, customerId))
    ) {
      return { status: false, error: cSubscriptionOrderCreateError.INVALID_COUPON_FOR_USER };
    }

    if (
      coupon &&
      coupon.onlyFirstOrdersFor === firstOrdersType.BRAND
    ) {
      let stats = {};
      if (coupon.onlyFirstOrders === true) {
        // stats = await this.context.customerStats.getByCustomerForBrand(customerId, subscription.brandId);
        stats = await this.customerSubscriptionOrderStatsByCoupon({
          customerId,
          brandId: subscription.brandId,
        });
      } else if (coupon.onlyFirstOrders === false) {
        // stats = await this.context.customerStats.getByCustomerForBrandUsingParticularCoupon(
        //   customerId,
        //   subscription.brandId,
        //   couponId,
        // );
        stats = await this.customerSubscriptionOrderStatsByCoupon({
          customerId,
          brandId: subscription.brandId,
          couponId,
        });
      }

      if (
        stats &&
        stats.totalOrders >= Number(coupon.firstOrdersRedemptionLimit)
      ) {
        return { status: false, error: cSubscriptionOrderCreateError.INVALID_COUPON_FIRST_ORDER_REDEMPTION_LIMIT_EXCEEDED };
      }
    }

    const checkCouponCode = await this.checkCouponCode(null, {
      couponInput: {
        code: coupon.code,
        countryIso: country.isoCode,
        brandId: subscription.brandId,
      },
    });
    if (checkCouponCode && checkCouponCode.error) {
      return { status: false, error: checkCouponCode.error };
    }
    return { status: true };
  }

  async customerSubscriptionOrderStatsByCoupon({ customerId, brandId, couponId }) {
    const query = this.db(this.tableName)
      .where('customer_id', customerId)
      .where('paid', true)
      .where('status', cSubscriptionOrderStatus.COMPLETED);
    if (brandId) {
      const subscriptionIds = await this.db(this.context.cSubscription.tableName)
        .select('id')
        .where({
          'brand_id': brandId,
          'status': cSubscriptionStatus.ACTIVE,
        });
      if (subscriptionIds && subscriptionIds.length > 0) {
        const cleanSubscriptionIds = [...new Set(subscriptionIds.map(t => t.id))];
        query.whereIn('subscription_id', cleanSubscriptionIds);
      } else {
        return {
          customerId,
          totalOrders: 0,
        };
      }
    }
    if (couponId) {
      query.andWhere('coupon_id', couponId);
    }
    const res = await query.count().first();
    if (res) {
      return {
        customerId,
        totalOrders: res.count,
      };
    } else {
      return {
        customerId,
        totalOrders: 0,
      };
    }
  }

  async checkCouponCode(root, args) {
    const {
      code,
      countryIso,
      paymentMethod,
      brandId,
    } = args.couponInput;
    if (args?.couponInput) {
      args.couponInput.orderCouponType = orderCouponTypes.SUBSCRIPTION_ORDER;
    }
    const customerId = this.context.auth.id;
    let coupon = null;
    const country = await this.context.country.getByCode(countryIso);
    if (!country) {
      coupon = null;
    }

    await this.context.coupon.referralCouponExist({
      couponCode: code,
      customerId,
    });
    coupon = await this.context.coupon.getByCodeCountryIsoAndCustomerId(
      code,
      countryIso,
      customerId,
      args.couponInput.orderCouponType,
    );
    if (!coupon) {
      return formatError(
        [couponValidationError.INVALID_COUPON_FOR_USER],
        args.couponInput,
      );
    }

    // Promo Type
    if (coupon && coupon.type === promoType.REGULAR) {
      const couponDetails = await this.context.couponDetail.getAllByCoupon(coupon.id);
      if (!couponDetails) {
        return formatError(
          [couponValidationError.INVALID_COUPON],
          args.couponInput,
        );
      }
      const validCouponDetailTypes = [couponType.FLAT_AMOUNT, couponType.PERCENTAGE];
      if (!couponDetails.every(t => validCouponDetailTypes.includes(t.type))) {
        return formatError(
          [couponValidationError.INVALID_COUPON_TYPE_FOR_SUBSCRIPTION],
          args.couponInput,
        );
      }
    } else {
      return formatError(
        [couponValidationError.INVALID_COUPON_TYPE_FOR_SUBSCRIPTION],
        args.couponInput,
      );
    }

    // Payment Scheme
    if (paymentMethod) {
      const invalidPaymentMethods = [paymentSchemes.CASH];
      if (invalidPaymentMethods.includes(paymentMethod)) {
        return formatError(
          [couponValidationError.INVALID_PAYMENT_METHOD_FOR_SUBSCRIPTION],
          args.couponInput,
        );
      }
    }

    // Internal Payment Method Check
    if (
      coupon &&
      coupon.allowedPaymentMethods &&
      coupon.allowedPaymentMethods.length > 0 &&
      (!paymentMethod ||
        !coupon.allowedPaymentMethods.includes(paymentMethod))
    ) {
      // only if payment method is selected
      // otherwise lets/we assume order would be paid through credits/giftcards
      if (paymentMethod) {
        coupon = null;
      }
    }

    // Customer Check
    if (coupon) {
      coupon.isValidForThisCustomer = await this.context.coupon.isValidForThisCustomer(
        code,
        customerId,
        country.id,
        undefined,
        orderCouponTypes.SUBSCRIPTION_ORDER,
      );
    }

    // use older coupon validation first
    const validCoupon = coupon;
    if (
      !validCoupon ||
      (validCoupon && validCoupon.isValidForThisCustomer === false)
    ) {
      return formatError(
        [couponValidationError.INVALID_COUPON_FOR_USER],
        args.couponInput
      );
    }

    // Brand Check
    if (validCoupon && brandId) {
      const isValidBrandCoupon = await this.context.coupon.isCouponAvailableForBrandByBrandId(
        brandId,
        validCoupon.id
      );
      if (!isValidBrandCoupon) {
        return formatError(
          [couponValidationError.INAPPLICABLE_VENDOR_FOR_COUPON],
          args.couponInput
        );
      }
      const brand = await this.context.brand.getById(brandId);
      if (
        brand &&
        validCoupon.onlyFirstOrdersFor === firstOrdersType.BRAND
      ) {
        let stats = {};
        if (validCoupon.onlyFirstOrders === true) {
          stats = await this.customerSubscriptionOrderStatsByCoupon({
            customerId,
            brandId,
          });
        } else if (validCoupon.onlyFirstOrders === false) {
          stats = await this.customerSubscriptionOrderStatsByCoupon({
            customerId,
            brandId,
            couponId: validCoupon.id
          });
        }

        if (
          stats &&
          stats.totalOrders >= Number(validCoupon.firstOrdersRedemptionLimit)
        ) {
          return formatError(
            [couponValidationError.COUPON_ALREADY_CONSUMED_BY_VENDOR],
            args.couponInput
          );
        }
      } else if (
        brand &&
        validCoupon.onlyFirstOrdersFor === firstOrdersType.COFE
      ) {
        const stats = await this.customerSubscriptionOrderStatsByCoupon({
          customerId,
          couponId: validCoupon.id
        });
        if (
          stats &&
          stats.totalOrders >= Number(validCoupon.customerRedemptionLimit)
        ) {
          return formatError(
            [couponValidationError.COUPON_ALREADY_CONSUMED_BY_VENDOR],
            args.couponInput
          );
        }
      }
    }

    return { coupon: validCoupon };
  }

  async getCouponDiscount({ customerId, coupon, costReductionPerk, subtotal, perksAmount = 0, useCredits, currency }) {
    if (!coupon || (!costReductionPerk && perksAmount === 0)) {
      return { amount: 0, percentage: 0 };
    }

    if (useCredits && coupon.type === promoType.CASHBACK) {
      const { promotioanalCredits } = await this.context.coupon.allCredits(
        customerId,
        currency.id,
      );
      subtotal = Math.max(Number(subtotal) - Number(promotioanalCredits), 0);
    }

    // get cost reduction coupon detail
    let percentage = 0;
    const limit = parseFloat(coupon.maxLimit);

    if (!costReductionPerk) {
      if (perksAmount > 0) {
        // incorporate perks amount in percentage of discount
        const discount = perksAmount;
        if (limit > 0 && limit < discount) {
          return { amount: limit, percentage };
        }
        if (discount > subtotal) {
          return { amount: subtotal, percentage };
        }
        return { amount: discount, percentage };
      }

      return { amount: 0, percentage: 0 };
    }
    if (costReductionPerk.type === couponType.PERCENTAGE) {
      percentage = parseFloat(costReductionPerk.amount);
      // incorporate perks amount in percentage of discount
      const discount = subtotal * (percentage / 100) + perksAmount;
      if (limit > 0 && limit < discount) {
        return { amount: limit, percentage };
      }
      if (discount > subtotal) {
        return { amount: subtotal, percentage };
      }
      return { amount: discount, percentage };
    }
    // incorporate perks amount in percentage of discount
    const totalDiscount = Number(costReductionPerk.amount) + perksAmount;
    if (
      totalDiscount > subtotal &&
      (!costReductionPerk.type || costReductionPerk.type === promoType.REGULAR)
    ) {
      return { amount: Number(subtotal), percentage };
    }
    return { amount: totalDiscount, percentage };
  }

  getCostReductionPerk(couponDetails) {
    const costReductionPerkTypes = [
      couponType.PERCENTAGE,
      couponType.FLAT_AMOUNT,
    ];
    return couponDetails.find(couponDetail =>
      costReductionPerkTypes.includes(couponDetail.type)
    );
  }

  getMoney(value, currency) {
    return new Money(
      value,
      currency.decimalPlace,
      currency.lowestDenomination
    );
  }
}

module.exports = CSubscriptionOrder;
