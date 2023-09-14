const { includes, map, omit } = require('lodash');

const {
  paymentSchemes,
  paymentServiceError,
  paymentProviders,
  paymentLogsRequestType,
} = require('./enums');
const {
  countryConfigurationKeys,
  fulfillmentType,
  statusTypes,
  paymentStatusOrderType,
  customerCardTokenSaveError,
  customerCardSaveStatus,
} = require('../schema/root/enums');
const { countryPaymentServices } = require('../../config');
const {
  addLocalizationField, formatError
} = require('../lib/util');
const MyFatoorah = require('./my-fatoorah');
const CheckoutCom = require('./checkout-com');
const MobileExpress = require('./mobile-express');
const Tap = require('./tap');
const { kinesisEventTypes } = require('../lib/aws-kinesis-logging');

class PaymentService {
  constructor(db, context) {
    this.db = db;
    this.context = context;
    this.paymentProviders = {
      [paymentProviders.MY_FATOORAH]: new MyFatoorah(context),
      [paymentProviders.CHECKOUT]: new CheckoutCom(context),
      [paymentProviders.MOBILE_EXPRESS]: new MobileExpress(context),
      [paymentProviders.TAP]: new Tap(context),
    };
    this.icons = {
      [paymentSchemes.APPLE_PAY]:
        'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/staging/1675248532092_apple_pay_mark_rectangle.png',
      [paymentSchemes.GOOGLE_PAY]:
        'https://cofe-app-uploads.s3-eu-west-1.amazonaws.com/payment-methods/GooglePay.png',
      [paymentSchemes.CASH]:
        'https://cofe-app-uploads.s3-eu-west-1.amazonaws.com/payment-methods/Cash.png',
      [paymentSchemes.KNET]:
        'https://cofe-app-uploads.s3-eu-west-1.amazonaws.com/payment-methods/Knet.png', // KNET
      [paymentSchemes.CARD]:
        'https://cofe-app-uploads.s3-eu-west-1.amazonaws.com/payment-methods/VisaMastercard.png', // VISA/MASTER
      [paymentSchemes.SAVED_CARD]:
        'https://cofe-app-uploads.s3-eu-west-1.amazonaws.com/payment-methods/VisaMastercard.png', // VISA/MASTER
      [paymentSchemes.MADA]:
        'https://cofe-app-uploads.s3-eu-west-1.amazonaws.com/payment-methods/MADA.png', // MADA
      [paymentSchemes.STC_PAY]:
        'https://cofe-app-uploads.s3-eu-west-1.amazonaws.com/payment-methods/STCPay.png', // SA STC Pay
      [paymentSchemes.AMEX]:
        'https://cofe-app-uploads.s3-eu-west-1.amazonaws.com/payment-methods/Amex.png', // AMEX
      ADD_CARD:
        'https://cofe-app-uploads.s3-eu-west-1.amazonaws.com/payment-methods/CreditCard.png',
      Visa:
        'https://cofe-app-uploads.s3-eu-west-1.amazonaws.com/payment-methods/Visa.png',
      Mastercard:
        'https://cofe-app-uploads.s3-eu-west-1.amazonaws.com/payment-methods/Mastercard.png',
      'Master Card':
        'https://cofe-app-uploads.s3-eu-west-1.amazonaws.com/payment-methods/Mastercard.png',
      'American Express':
        'https://cofe-app-uploads.s3-eu-west-1.amazonaws.com/payment-methods/Amex.png',
      JCB:
        'https://cofe-app-uploads.s3-eu-west-1.amazonaws.com/payment-methods/JCB.png',
      Discover:
        'https://cofe-app-uploads.s3-eu-west-1.amazonaws.com/payment-methods/Discover.png',
      'Diners Club International':
        'https://cofe-app-uploads.s3-eu-west-1.amazonaws.com/payment-methods/DinersClub.png',
      // TODO change image
      // Voucher:
      //   'https://cofe-app-uploads.s3-eu-west-1.amazonaws.com/payment-methods/Mastercard.png',
      'Reward Discount':
        'https://cofe-app-uploads.s3-eu-west-1.amazonaws.com/payment-methods/Rewards.png',
      'Gift Card':
        'https://cofe-app-uploads.s3-eu-west-1.amazonaws.com/payment-methods/GiftCard.png',
      Credits:
        'https://cofe-app-uploads.s3-eu-west-1.amazonaws.com/payment-methods/Credits.png',
      Cashback:
        'https://cofe-app-uploads.s3-eu-west-1.amazonaws.com/payment-methods/Credits.png',
      // TODO change images
      // 'Discovery Credits':
      //   'https://cofe-app-uploads.s3-eu-west-1.amazonaws.com/payment-methods/Mastercard.png',
    };
  }

  async getConfig(service, countryCode = 'GB') {
    if (!includes(countryPaymentServices[countryCode], service)) {
      return { error: `country ${countryCode} not supported by ${service}` };
    }
    return this.paymentProviders[service].getConfig(countryCode);
  }

  async getPaymentMethods({
    fulfillment,
    countryCode,
    brandLocationId,
    customerId,
    includeCash,
    platform = 'COFEAPP',
  }) {
    let paymentMethods = [];
    const country = await this.context.country.getByCode(countryCode);
    if (!country) {
      return { errors: [paymentServiceError.COUNTRY_CODE_REQUIRED] };
    }

    const allowCashPayment = await this.isCashPaymentAllowed({
      fulfillment,
      countryId: country.id,
    });

    let brandLocationAcceptCash = false;
    if (brandLocationId) {
      const brandLocation = await this.context.brandLocation.getById(
        brandLocationId
      );
      brandLocationAcceptCash = brandLocation.acceptsCash;
    }

    if (allowCashPayment && (brandLocationAcceptCash || includeCash)) {
      paymentMethods.push({
        paymentScheme: paymentSchemes.CASH,
        provider: paymentProviders.INTERNAL,
        name: {
          en: 'Cash',
          ar: 'نقدًا',
          tr: 'Nakit',
        },
      });
    }

    const paymentProvidersForCountry = await this.detectPaymentProvidersViaCountryCode(
      countryCode
    );

    for (const {
      paymentProvider: usePaymentProvider,
    } of paymentProvidersForCountry) {
      let params = {
        customerId,
        countryCode,
        platform,
      };
      if (usePaymentProvider === paymentProviders.MY_FATOORAH) {
        // eslint-disable-next-line no-await-in-loop
        const { isoCode: currencyCode } = await this.context.currency.getById(
          country.currencyId
        );
        params = { countryCode, currencyCode, platform };
      }
      // eslint-disable-next-line no-await-in-loop
      let providerPaymentMethods = await this.paymentProviders[
        usePaymentProvider
      ].getPaymentMethods(params);
      providerPaymentMethods = this.addPaymentScheme(providerPaymentMethods);
      providerPaymentMethods = addLocalizationField(
        providerPaymentMethods,
        'name'
      );
      map(providerPaymentMethods, providerPaymentMethod => {
        paymentMethods.push({
          paymentScheme: providerPaymentMethod.paymentScheme,
          provider: usePaymentProvider,
          name: providerPaymentMethod.name,
          sourceId: providerPaymentMethod.sourceId,
          subText: providerPaymentMethod.subText,
          isCVVRequired: !!providerPaymentMethod.isCVVRequired,
          isUsableForAutoRenewal:
            !!providerPaymentMethod.isUsableForAutoRenewal,
        });
      });
    }

    paymentMethods = this.addIcons(paymentMethods);

    return paymentMethods;
  }

  async isCashPaymentAllowed({ fulfillment, countryId }) {
    if (fulfillment === fulfillmentType.EXPRESS_DELIVERY) {
      return false;
    }
    if (fulfillment !== fulfillmentType.DELIVERY) {
      // Cash payment allowed for non-delivery fulfillments
      return true;
    }
    const dbConfig = await this.context.countryConfiguration.getByKey(
      countryConfigurationKeys.BLOCK_CASH_ON_DELIVERY,
      countryId
    );
    if (dbConfig && dbConfig.configurationValue === 'true') {
      // Disallow cash option
      return false;
    }
    return true;
  }

  // async detectPaymentProvider({ countryCode, paymentMethod = {} }) {
  //   let detectedPaymentProvider = {
  //     paymentProvider: paymentProviders.INTERNAL,
  //   };
  //   Object.keys(availablePaymentServices).map(availablePaymentService => {
  //     if (
  //       includes(availablePaymentServices[availablePaymentService], countryCode)
  //     ) {
  //       detectedPaymentProvider = {
  //         paymentProvider: availablePaymentService,
  //       };
  //     }
  //
  //     return { paymentProvider: availablePaymentService };
  //   });
  //
  //   if (paymentMethod && paymentMethod.paymentScheme) {
  //     const { sourceId } = paymentMethod;
  //
  //     if (sourceId) {
  //       if (/^(mf)_(\d+)$/.test(sourceId)) {
  //         return { paymentProvider: paymentProviders.MY_FATOORAH };
  //       } else if (paymentMethod.paymentScheme === paymentSchemes.SAVED_CARD) {
  //         const customerCardToken = await this.context.customerCardToken.getById(
  //           sourceId
  //         );
  //         return {
  //           paymentProvider: customerCardToken.paymentProvider,
  //           customerCardToken,
  //         };
  //       } else if (sourceId === 'MobileExpress') {
  //         // TODO ASK ABOUT THIS
  //         return { paymentProvider: paymentProviders.MOBILE_EXPRESS };
  //       }
  //       return { paymentProvider: paymentProviders.CHECKOUT };
  //     }
  //
  //     return { paymentProvider: paymentProviders.INTERNAL };
  //   }
  //
  //   return detectedPaymentProvider;
  // }

  async detectPaymentProviderViaPaymentMethod(paymentMethod = {}) {
    const detectedPaymentProvider = {
      paymentProvider: paymentProviders.INTERNAL,
    };
    if (paymentMethod && paymentMethod.paymentScheme) {
      const { sourceId } = paymentMethod;

      if (sourceId) {
        if (/^(mf)_(\d+)$/.test(sourceId)) {
          return { paymentProvider: paymentProviders.MY_FATOORAH };
        } else if (/^(tap)#(.*)$/.test(sourceId)) {
          return { paymentProvider: paymentProviders.TAP };
        } else if (paymentMethod.paymentScheme === paymentSchemes.SAVED_CARD) {
          const customerCardToken = await this.context.customerCardToken.getById(
            sourceId
          );
          if (customerCardToken && customerCardToken.status !== statusTypes.ACTIVE) {
            throw new Error('Card is not Active');
          }
          return {
            paymentProvider: customerCardToken.paymentProvider,
            customerCardToken,
          };
        } else if (sourceId === 'MobileExpress') {
          // TODO ASK ABOUT THIS
          return { paymentProvider: paymentProviders.MOBILE_EXPRESS };
        }

        return { paymentProvider: paymentProviders.CHECKOUT };
      }

      return { paymentProvider: paymentProviders.INTERNAL };
    }

    return detectedPaymentProvider;
  }

  async detectPaymentProvidersViaCountryCode(countryCode) {
    const newPaymentServices = await this.context.paymentMethod.getPaymentProviderByCountryCode(countryCode);
    return newPaymentServices;
    /* const paymentServices = [];
    if (!isNullOrUndefined(countryPaymentServices[countryCode])) {
      for (const paymentService of countryPaymentServices[countryCode]) {
        paymentServices.push({
          paymentProvider: paymentService,
        });
      }
    }

    // Line 94 return an error. Also, BE side never use internal payment provider.
    // INTERNAL payment option is used for fallback payment option
    if (isEmpty(paymentServices)) {
      return [
        {
          paymentProvider: paymentProviders.INTERNAL,
        },
      ];
    }
    return paymentServices; */
  }

  addPaymentScheme(paymentMethods) {
    const _paymentMethods = [];
    map(paymentMethods, paymentMethod => {
      let _paymentScheme;
      switch (paymentMethod.identifier) {
        case 'KNET':
        case 'MADA':
        case 'STC_PAY':
        case 'AMEX':
        case 'SAVED_CARD':
        case 'ADD_CARD':
        case 'CARD':
        case paymentSchemes.GOOGLE_PAY:
        case paymentSchemes.APPLE_PAY:
          _paymentScheme = paymentMethod.identifier;
          break;
        case 'VISA_MASTER':
        case 'UAE_DEBIT_CARDS':
        case 'DEBIT_CREDIT_CARDS':
          _paymentScheme = paymentSchemes.CARD;
          break;
        case 'APPLE_PAY_KWD':
          _paymentScheme = paymentSchemes.APPLE_PAY;
          break;
        default:
          break;
      }
      _paymentMethods.push({
        ...paymentMethod,
        paymentScheme: _paymentScheme,
      });
    });

    return _paymentMethods;
  }

  addIcons(paymentMethods) {
    return paymentMethods.map(paymentMethod => {
      if (paymentMethod.imageUrl) return paymentMethod;
      paymentMethod.imageUrl = this.icons[paymentMethod.name?.en] || this.icons[paymentMethod.paymentMethodType] || this.icons[paymentMethod.paymentScheme];
      return paymentMethod;
    });
  }

  async pay(data) {
    if (!data) throw new Error('No data provided');
    const { paymentMethod } = data;
    if (!paymentMethod) {
      throw new Error('No paymentMethod provided');
    }

    let payData = {};
    const {
      paymentProvider: usePaymentProvider,
      customerCardToken,
    } = await this.detectPaymentProviderViaPaymentMethod(paymentMethod);

    if (
      usePaymentProvider === paymentProviders.CHECKOUT
      && paymentMethod.paymentScheme === paymentSchemes.SAVED_CARD
      && customerCardToken.customerId !== data.customerId
    ) {
      this.context.kinesisLogger.sendLogEvent(
        {
          request: this.context.req.body,
          user: this.context.req.user
        },
        kinesisEventTypes.fraudDetection
      ).catch(err => console.log(err));
      throw new Error('Wrong card token');
    }

    const db3DSConfig = await this.context.countryConfiguration.getByKey(
      countryConfigurationKeys.MINIMUM_AMOUNT_FOR_3DS,
      data.countryId,
    );

    if (
      db3DSConfig
      && data.orderType === paymentStatusOrderType.ORDER_SET
      && Number(db3DSConfig.configurationValue) > Number(data.amount)
      && !this.context.customerCardToken.is3DSRequired(customerCardToken)
    ) {
      data.isEnabled3ds = false;
    }

    switch (usePaymentProvider) {
      case paymentProviders.MY_FATOORAH: {
        payData = omit(data, ['paymentMethodInput']);
        const matches = String(paymentMethod.sourceId).match(/^(mf)_(\d+)$/);
        payData.paymentMethod = matches[2] || null;
        break;
      }
      case paymentProviders.CHECKOUT: {
        payData = {
          token: customerCardToken
            ? customerCardToken.sourceToken
            : paymentMethod.sourceId,
          amount: data.amount,
          currency: data.currencyCode,
          customerId: data.customerId,
          reference: `${data.orderType}#${data.referenceOrderId}`,
          isEnabled3ds: data.isEnabled3ds ?? true,
          isCVVRequired: customerCardToken
            ? this.context.customerCardToken.isCVVRequired(customerCardToken)
            : false,
          cvv: paymentMethod.cvv,
          subscription: data.subscription,
        };
        break;
      }
      case paymentProviders.MOBILE_EXPRESS: {
        const mobileExpressHandler = this.paymentProviders[
          paymentProviders.MOBILE_EXPRESS
        ];
        const paymentCustomer = await this.context.customer.getById(
          data.customerId
        );
        payData = mobileExpressHandler.preparePaymentRequestBody({
          data,
          customer: paymentCustomer,
        });
        console.log('Pay Data in paymentService : ', payData);
        break;
      }
      case paymentProviders.TAP: {
        payData = {
          source: {
            id: paymentMethod.sourceId.match(/^(tap)#(.*)$/)[2]
          },
          amount: data.amount,
          currencyCode: data.currencyCode,
          countryCode: data.countryCode,
          customerId: data.customerId,
          metadata: {
            orderType: data.orderType,
            referenceOrderId: data.referenceOrderId,
            ...data.subscription
          },
          reference: {
            transaction: data.referenceOrderId,
            order: data.referenceOrderId,
          },
          threeDSecure: data.isEnabled3ds ?? true,
          paymentScheme: paymentMethod.paymentScheme,
          sourceId: paymentMethod.sourceId,
        };
        break;
      }
      default:
        break;
    }
    return this.paymentProviders[usePaymentProvider].pay(payData);
  }

  async getCustomerSavedCardTokens({ paymentProvider, customerId }) {
    return this.paymentProviders[paymentProvider].getCustomerSavedCardTokens(
      customerId
    );
  }

  async saveCardToken(data, paymentProvider) {
    if (!data) {
      throw new Error('No data provided');
    }
    if (!paymentProvider) {
      throw new Error('No paymentProvider specified');
    }
    // If in the future, a new card provider is required, remove this check
    if (paymentProvider !== paymentProviders.CHECKOUT) {
      throw new Error('Card Save is only allowed via Checkout.com');
    }
    // currently only Checkout.com allows
    return this.paymentProviders[paymentProvider].saveCardToken(data);
  }

  validateSaveCardTokenWithVerification(data) {
    const { token, customerId, countryIsoCode } = data;
    if (!token) {
      return formatError([customerCardTokenSaveError.MISSING_TOKEN], data);
    }
    if (!customerId) {
      return formatError(
        [customerCardTokenSaveError.MISSING_CUSTOMER_ID],
        data
      );
    }
    if (!countryIsoCode) {
      return formatError(
        [customerCardTokenSaveError.MISSING_COUNTRY_ISO],
        data
      );
    }
  }

  /*
   For 3-Ds Enabled Cards, an additional step with OTP may be needed, th
   */
  async saveCardTokenWithVerification(data, paymentProvider) {
    if (!data) {
      throw new Error('No data provided');
    }
    if (!paymentProvider) {
      throw new Error('No paymentProvider specified');
    }
    const validationResult = this.validateSaveCardTokenWithVerification(data);
    if (validationResult) {
      return {
        requiresRedirect: false,
        saveStatus: customerCardSaveStatus.CARD_SAVE_FAILED,
        ...validationResult
      };
    }

    return this.paymentProviders[paymentProvider].saveCardTokenWithVerification(
      data
    );
  }

  setDefaultCardToken({ id, isDefault, customerId }) {
    return this.context.customerCardToken.setDefault(id, customerId, isDefault);
  }

  async deleteCardToken({ id, customerId }) {
    const customerCardToken = await this.context.customerCardToken.getById(id);
    if (customerCardToken.paymentProvider === paymentProviders.TAP) {
      await this.paymentProviders[paymentProviders.TAP].removeCardFromTap(
        customerCardToken
      );
    }
    return this.context.customerCardToken.softDelete(id, customerId);
  }

  paymentStatus(providerType, data) {
    switch (providerType) {
      case paymentProviders.CHECKOUT: {
        return this.paymentProviders[paymentProviders.CHECKOUT].paymentStatus(
          data
        );
      }
      case paymentProviders.MOBILE_EXPRESS: {
        return this.paymentProviders[
          paymentProviders.MOBILE_EXPRESS
        ].checkPaymentStatus(data.mobileExpress);
      }
      case paymentProviders.TAP: {
        return this.paymentProviders[paymentProviders.TAP].paymentStatus(data);
      }
      default: {
        throw new Error(
          'Payment Status Method is not provided for : ' + providerType
        );
      }
    }
  }

  getSaveCardStatus(providerType, data) {
    switch (providerType) {
      case paymentProviders.CHECKOUT: {
        return this.paymentProviders[
          paymentProviders.CHECKOUT
        ].getSaveCardPaymentStatus(data);
      }
      case paymentProviders.TAP: {
        return this.paymentProviders[
          paymentProviders.TAP
        ].getSaveCardPaymentStatus(data);
      }
      default: {
        throw new Error(
          'Save Card Callback is currently only supported for Checkout.com : '
        );
      }
    }
  }

  /**
   * Get subscription auto-renewal data from raw response. Returns null
   * if payment was not auto-renewal payment.
   * @param provider
   * @param rawResponse
   * @param countryCode
   * @returns {Promise<null|object>}
   */
  async getSubscriptionAutoRenewalData(provider, rawResponse, countryCode) {
    if (provider !== paymentProviders.CHECKOUT) {
      return null;
    }
    return this.paymentProviders[provider].getSubscriptionAutoRenewalData(
      rawResponse, countryCode
    );
  }

  async cancelAuthorizedPayment(providerType, data) {
    let provider;
    switch (providerType) {
      case paymentProviders.CHECKOUT: {
        provider = this.paymentProviders[paymentProviders.CHECKOUT];
        break;
      }
      default: {
        throw new Error(
          `Cancel authorized payment method is not provided for:${providerType}`
        );
      }
    }
    const {status, payment} = await provider.cancelAuthorizedPayment(data);
    await this.context.paymentServiceLog.savePaymentLog({
      paymentService: providerType,
      requestType: paymentLogsRequestType.CANCEL_AUTHORIZED_PAYMENT,
      orderType: data.orderType,
      referenceOrderId: data.referenceOrderId,
      request: data,
      response: payment,
    });
    return status;
  }

  getCofePaymentError(paymentProviderName, rawResponse) {
    const paymentProvider = this.paymentProviders[paymentProviderName];

    if (!paymentProvider) return null;

    return paymentProvider.getCofePaymentError(rawResponse);
  }
}

module.exports = PaymentService;
