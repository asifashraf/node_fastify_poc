const { includes, first, map } = require('lodash');
const ckoSdk = require('checkout-sdk-node');
// const { getClientFromHeader } = require('../../lib/util');
const { findErrorCode } = require('./error-code-matrix');
const { cofePaymentErrors } = require('../error-model');

const {
  paymentProvider,
  orderPaymentMethods,
  paymentStatusName,
  customerCardSaveStatus,
} = require('../../schema/root/enums');
const {
  paymentSchemes,
  paymentProviders,
  paymentLogsRequestType,
} = require('../enums');
const {
  transformToCamelCase,
  buildAbsoluteUrl,
  isNullOrUndefined,
} = require('../../lib/util');
const { kinesisEventTypes } = require('../../lib/aws-kinesis-logging');
const { checkoutCom } = require('../../../config');

function badParameter(param) {
  throw new Error(`${param} is invalid`);
}

function badResponse(param) {
  throw new Error(`${param} was not received from Checkout`);
}

function formatCurrency(code) {
  let precision = 2;
  switch (true) {
    case includes(['BHD', 'LYD', 'JOD', 'KWD', 'OMR', 'TND'], code):
      precision = 3;
      break;
    case includes(
      [
        'BIF',
        'DJF',
        'GNF',
        'ISK',
        'KMF',
        'XAF',
        'CLF',
        'XPF',
        'JPY',
        'PYG',
        'RWF',
        'KRW',
        'VUV',
        'VND',
        'XOF',
      ],
      code
    ):
      precision = 1;
      break;
    default:
      precision = 2;
  }

  return amount => {
    return Number.parseInt(
      (Number(amount) * Math.pow(10, precision)).toString(),
      10
    );
  };
}

class CheckoutCom {
  constructor(context) {
    this.context = context;
    // this.client = new ckoSdk.Checkout(checkoutCom.secretKey);
  }

  setClient(countryCode = 'GB') {
    const account = countryCode.toUpperCase();
    this.client = new ckoSdk.Checkout(checkoutCom[account].secretKey, { timeout: 60000 });
  }

  getConfig(countryCode) {
    return { publicKey: checkoutCom[countryCode].publicKey };
  }

  async getPaymentMethods({ customerId, countryCode }) {
    const paymentMethods = [];

    const providerPaymentMethods = await this.context.paymentMethod.getProviderPaymentMethodsByCountryCode(paymentProvider.CHECKOUT, countryCode);

    const cardTokens = await this.context.customerCardToken.getAllByCustomerAndProvider(
      customerId,
      paymentProvider.CHECKOUT
    );

    if (providerPaymentMethods?.isCardSavedEnable) {
      map(cardTokens, customerCardToken => {
        const expMonth = customerCardToken.expiryMonth
          .toString()
          .padStart(2, '0');
        let expYear = customerCardToken.expiryYear.toString();
        expYear = expYear.substring(expYear.length - 2, expYear.length);

        const isCVVRequired = this.context.customerCardToken.isCVVRequired(
          customerCardToken
        );

        const isUsableForAutoRenewal = this.context.customerCardToken
          .isUsableForAutoRenewal(customerCardToken);

        paymentMethods.push({
          id: orderPaymentMethods.CARD,
          name: customerCardToken.scheme,
          customerCardToken,
          identifier: paymentSchemes.SAVED_CARD,
          isCVVRequired,
          isUsableForAutoRenewal,
          sourceId: customerCardToken.id,
          subText: `**** ${customerCardToken.last4} | Expiry: ${expMonth}/${expYear}`,
        });
      });
    }

    if (providerPaymentMethods?.isApplePayEnable) {
      paymentMethods.push({
        id: paymentSchemes.APPLE_PAY,
        identifier: paymentSchemes.APPLE_PAY,
        name: 'Apple Pay',
        nameAr: 'Apple Pay',
        nameTr: 'Apple Pay',
      });
    }
    if (providerPaymentMethods?.isGooglePayEnable) {
      paymentMethods.push({
        id: paymentSchemes.GOOGLE_PAY,
        identifier: paymentSchemes.GOOGLE_PAY,
        name: 'Google Pay',
        nameAr: 'Google Pay',
        nameTr: 'Google Pay',
      });
    }

    if (providerPaymentMethods?.isCardSavedEnable) {
      paymentMethods.push({
        id: paymentSchemes.ADD_CARD,
        identifier: paymentSchemes.ADD_CARD,
        name: 'Add Credit Card',
        nameAr: 'اضافة بطاقة ائتمان',
        nameTr: 'Kredi Kartı Ekle',
        isUsableForAutoRenewal: true,
      });
    }
    /*
    if (checkoutCom.isApplePayEnabled) {
      // const client = getClientFromHeader(this.context.req.headers);
      // const applePayDisabledCountries = client.os === 'ios' && client.version >= 6413 ? ['KW'] : ['KW'];
      const applePayDisabledCountries = ['KW'];
      if (!applePayDisabledCountries.includes(countryCode)) {
        paymentMethods.push({
          id: paymentSchemes.APPLE_PAY,
          identifier: paymentSchemes.APPLE_PAY,
          name: 'Apple Pay',
          nameAr: 'Apple Pay',
          nameTr: 'Apple Pay',
        });
      }
    }
    if (checkoutCom.isGooglePayEnabled) {
      const googlePlayDisabledCountries = [];
      if (!googlePlayDisabledCountries.includes(countryCode)) {
        paymentMethods.push({
          id: paymentSchemes.GOOGLE_PAY,
          identifier: paymentSchemes.GOOGLE_PAY,
          name: 'Google Pay',
          nameAr: 'Google Pay',
          nameTr: 'Google Pay',
        });
      }
    }
    // So Google and Apple Pay appear first

    if (!cardSaveDisabledCountries.includes(countryCode)) {
      paymentMethods.push({
        id: paymentSchemes.ADD_CARD,
        identifier: paymentSchemes.ADD_CARD,
        name: 'Add Credit Card',
        nameAr: 'اضافة بطاقة ائتمان',
        nameTr: 'Kredi Kartı Ekle',
        isUsableForAutoRenewal: true,
      });
    }
    */

    return paymentMethods;
  }

  async getCustomerSavedCardTokens(customerId) {
    return this.context.customerCardToken.getAllByCustomerAndProvider(
      customerId,
      paymentProvider.CHECKOUT
    );
  }

  async pay(data) {
    const response = {
      id: null,
      error: null,
      rawResponse: null,
      paymentUrl: null,
      approved: false,
    };
    try {
      const rawResponse = await this.processPayment(data);
      this.context.kinesisLogger.sendLogEvent({data, rawResponse}, 'checkout-payInit');
      response.id = rawResponse.id;
      response.approved = rawResponse.approved || false;
      response.rawResponse = rawResponse;
      if (rawResponse.requiresRedirect) {
        response.paymentUrl = rawResponse.redirectLink;
      }
      if (rawResponse
        && rawResponse.status
        && rawResponse.status.trim().toLowerCase() === 'declined') {
        response.error = rawResponse;
      }
    } catch (err) {
      this.context.kinesisLogger.sendLogEvent(err, 'checkout-payError');
      console.log(err);
      response.error = err;
    }
    // we send order data in order_type#order_id format
    const orderData = String(data.reference).split('#');
    await this.context.paymentServiceLog.savePaymentLog({
      paymentService: paymentProviders.CHECKOUT,
      requestType: paymentLogsRequestType.EXECUTE_PAYMENT,
      orderType: orderData[0] || null,
      referenceOrderId: orderData[1] || null,
      request: data,
      response,
    });
    return response;
  }

  async getCustomerInformation(customerId) {
    const customerRecord = await this.context.customer.getById(customerId);
    const usableEmail =
      customerRecord.email && customerRecord.email !== ''
        ? customerRecord.email
        : `${customerRecord.phoneNumber.replace('+', '')}@cofecustomer.com`;
    return {
      name: `${customerRecord.firstName} ${customerRecord.lastName}`,
      email: usableEmail,
    };
  }

  async processPayment(data) {
    console.log({
      place: 'processPayment_logs_data',
      data,
    });
    const {
      token, amount, currency, customerId, reference, isEnabled3ds,
      isCVVRequired, cvv, subscription,
    } = data;
    if (!token) badParameter('token');
    if (!amount && amount !== 0) badParameter('amount');
    if (!currency) badParameter('currency');
    if (!customerId) badParameter('customerId');

    const currencyDb = await this.context.currency.getByCode(currency);
    const country = await this.context.country.getByCurrencyId(currencyDb.id);
    this.setClient(country.isoCode);

    const callbackUrl = buildAbsoluteUrl(
      `/cko/${country.isoCode}/payment-callback`
    );

    const currencyAmount = formatCurrency(currency)(amount);
    const checkoutCustomer = await this.context
      .db('checkout_customers')
      .where('customer_id', customerId)
      .then(transformToCamelCase)
      .then(first);
    const body = {
      currency,
      amount: currencyAmount,
      reference,
      // eslint-disable-next-line camelcase
      success_url: callbackUrl,
      // eslint-disable-next-line camelcase
      failure_url: callbackUrl,
    };

    switch (true) {
      case /^(card_tok)_([0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12})$/.test(
        token
      ):
        body.source = { token };
        break;
      case /^(tok)_(\w{26})$/.test(token):
        body.source = { token };
        break;
      case /^(src)_(\w{26})$/.test(token):
        body.source = { id: token };
        if (isCVVRequired && !!cvv) {
          body.source.cvv = cvv;
        }
        break;
      case /^(cus)_(\w{26})$/.test(token):
        body.source = { id: token };
        break;
      default:
        break;
    }

    if (checkoutCustomer) {
      body.customer = { id: checkoutCustomer.customerToken };
    } else {
      // So we can see the customers data on checkout.com hub
      body.customer = await this.getCustomerInformation(customerId);
    }
    if (reference) {
      body.reference = reference;
    }
    if (amount > 0) {
      body['3ds'] = { enabled: isEnabled3ds ?? true };
    }

    // Subscription payment settings. For more information please check;
    // https://www.checkout.com/docs/previous/payments/store-payment-details/requirements-for-stored-payment-details#Recurring_payments
    if (subscription?.autoRenewal) {
      const {
        subscriptionCustomerAutoRenewalId,
        initialOrder,
        previousPaymentId,
      } = subscription;
      body['payment_type'] = 'Recurring';
      body['merchant_initiated'] = !initialOrder;
      body['3ds'] = {
        enabled: initialOrder,
      };
      body.metadata = {
        subscriptionAutoRenewal: JSON.stringify({
          initialOrder,
          subscriptionCustomerAutoRenewalId,
          amount,
        }),
      };
      if (initialOrder) {
        body['3ds']['challenge_indicator'] = 'challenge_requested_mandate';
      } else {
        body['previous_payment_id'] = previousPaymentId;
      }
    }
    try {
      console.log({
        place: 'processPayment_logs_body',
        body,
      });
      const ckoResponse = await this.client.payments.request(body);
      console.log({
        place: 'processPayment_logs_ckoResponse',
        ckoResponse,
      });

      if (
        !checkoutCustomer &&
        ckoResponse &&
        ckoResponse.customer &&
        ckoResponse.customer.id
      ) {
        await this.context.db('checkout_customers').insert({
          // eslint-disable-next-line camelcase
          customer_id: customerId,
          // eslint-disable-next-line camelcase
          customer_token: ckoResponse.customer.id,
        });
      }
      return ckoResponse;
    } catch (err) {
      this.context.kinesisLogger.sendLogEvent(err, 'checkout-processPaymentError');
      if (
        err.body &&
        err.body.error_codes &&
        err.body.error_codes.includes('customer_not_found')
      ) {
        body.customer = await this.getCustomerInformation(customerId);
        const ckoResponse = await this.client.payments.request(body);
        if (ckoResponse && ckoResponse.customer && ckoResponse.customer.id) {
          await this.context
            .db('checkout_customers')
            .where('customer_id', customerId)
            // eslint-disable-next-line camelcase
            .update({ customer_token: ckoResponse.customer.id });
        }
        return ckoResponse;
      }
      console.log({
        place: 'src/payment-service/checkout-com/index.js:processPayment',
        err,
      });
      throw err;
    }
  }

  async getCustomerDetailsForCheckoutHub(checkoutCustomer, customerId) {
    if (checkoutCustomer) {
      return { id: checkoutCustomer.customerToken };
    }
    // If customer record doesn't exists in our db for checkout, directly send customer details
    // So we can see the customers data on checkout.com hub
    const customerRecord = await this.context.customer.getById(customerId);
    // some customers who registered with sso, don't have an email
    const usableEmail =
      customerRecord.email && customerRecord.email !== ''
        ? customerRecord.email
        : `${customerRecord.phoneNumber.replace('+', '')}@cofecustomer.com`;
    return {
      name: `${customerRecord.firstName} ${customerRecord.lastName}`,
      email: usableEmail,
    };
  }

  processSourceTokenViaId(token) {
    switch (true) {
      case /^(card_tok)_([0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12})$/.test(
        token
      ):
        return { token };
      case /^(tok)_(\w{26})$/.test(token):
        return { token };
      case /^(src)_(\w{26})$/.test(token):
        return { id: token };
      case /^(cus)_(\w{26})$/.test(token):
        return { id: token };
      default:
        return null;
    }
  }

  async processCardVerificationPayment(data) {
    const {
      token /* , amount */,
      currency,
      country,
      customerId,
      enable3ds,
      checkoutCustomer,
    } = data;
    // Checkout Card Verification requires 0 amount charge
    const amount = 1;

    this.setClient(country.isoCode);

    const callbackUrl = buildAbsoluteUrl(
      `/cko/${country.isoCode}/card-verification-callback`
    );
    const currencyAmount = formatCurrency(currency)(amount);
    // so we can identify the customer on callback
    const reference = `SAVE_CARD#${customerId}`;

    const body = {
      capture: false,
      currency,
      amount: currencyAmount,
      reference,
      // eslint-disable-next-line camelcase
      success_url: callbackUrl,
      // eslint-disable-next-line camelcase
      failure_url: callbackUrl,
    };

    const bodySource = this.processSourceTokenViaId(token);
    if (!isNullOrUndefined(bodySource)) {
      body.source = bodySource;
    }
    // Include Customer Data to request, so it can be showed on checkout.com hub

    // Enable 3ds is passed from CustomerCardTokenInput for testing purposes,
    // by default on dev/stg it comes non 3ds
    if (enable3ds) {
      body['3ds'] = { enabled: true };
    }

    body.customer = await this.getCustomerDetailsForCheckoutHub(
      checkoutCustomer,
      customerId
    );

    if (reference) {
      body.reference = reference;
    }

    return this.client.payments.request(body);
  }

  async saveCardToken(data) {
    const { token, customerId, countryIsoCode } = data;
    if (!token) badParameter('token');
    if (!customerId) badParameter('customerId');
    if (!countryIsoCode) badParameter('countryIsoCode');

    const country = await this.context.country.getByCode(countryIsoCode);
    const currency = await this.context.currency.getById(country.currencyId);
    data.currency = currency.isoCode;

    const response = await this.verifyCard(data);
    await this.context.kinesisLogger.sendLogEvent(
      response,
      kinesisEventTypes.checkoutVerifyCardResponse
    );
    return this.saveCard({
      data: response,
      customerId,
    });
  }

  async saveCardTokenWithVerification(data) {
    const { customerId, countryIsoCode } = data;

    const country = await this.context.country.getByCode(countryIsoCode);
    data.country = country;

    const currency = await this.context.currency.getById(country.currencyId);
    data.currency = currency.isoCode;

    const checkoutCustomer = await this.context
      .db('checkout_customers')
      .where('customer_id', customerId)
      .then(transformToCamelCase)
      .then(first);

    data.checkoutCustomer = checkoutCustomer;

    const ckoResponse = await this.processCardVerificationPayment(data);
    this.context.kinesisLogger.sendLogEvent(
      ckoResponse,
      kinesisEventTypes.checkoutVerifyCardResponse
    );
    if (ckoResponse.approved && ckoResponse.status === 'Card Verified') {
      if (
        !checkoutCustomer &&
        ckoResponse &&
        ckoResponse.customer &&
        ckoResponse.customer.id
      ) {
        await this.context.db('checkout_customers').insert({
          // eslint-disable-next-line camelcase
          customer_id: customerId,
          // eslint-disable-next-line camelcase
          customer_token: ckoResponse.customer.id,
        });
      }

      // If card is verified/approved without 3ds, then all is ok
      await this.saveCard({
        data: ckoResponse,
        customerId,
      });
      return {
        requiresRedirect: false,
        saveStatus: customerCardSaveStatus.CARD_SAVED_SUCCESSFULLY,
      };
    } else if (ckoResponse.status === 'Pending') {
      return {
        requiresRedirect: true,
        saveStatus: customerCardSaveStatus.ADDITIONAL_VERIFICATION_NEEDED,
        redirectUrl: ckoResponse.redirectLink,
      };
    }
    // If Card is not verified or it didn't lead to 3ds verification, it must be a fail
    this.context.kinesisLogger.sendLogEvent(
      ckoResponse,
      kinesisEventTypes.checkoutCardSaveFail
    );
    console.log('Card Save Failed : ', ckoResponse);
    return {
      requiresRedirect: false,
      saveStatus: customerCardSaveStatus.CARD_SAVE_FAILED,
    };
  }

  async verifyCard({ token, customerId, currency }) {
    return this.processPayment({
      token,
      customerId,
      amount: 0,
      currency,
    });
  }

  async saveCard({ data, customerId }) {
    const { source, customer } = data;
    if (!source || !source.id) {
      this.context.kinesisLogger.sendLogEvent(
        {
          data,
          customerId,
        },
        kinesisEventTypes.checkoutCardSourceError
      );
      badResponse('source');
    }
    if (!customer || !customer.id) {
      this.context.kinesisLogger.sendLogEvent(
        {
          data,
          customerId,
        },
        kinesisEventTypes.checkoutCardCustomerError
      );
      badResponse('customer');
    }

    const providerSource = first(transformToCamelCase([source]));

    const cardToken = {
      type: providerSource.type,
      expiryMonth: providerSource.expiryMonth,
      expiryYear: providerSource.expiryYear,
      name: providerSource.name,
      scheme: providerSource.scheme,
      last4: providerSource.last4,
      bin: providerSource.bin,
      cardType: providerSource.cardType,
      cardCategory: providerSource.cardCategory,
      issuer: providerSource.issuer,
      issuerCountry: providerSource.issuerCountry,
      productId: providerSource.productId,
      productType: providerSource.productType,
      customerId,
      customerToken: customer.id,
      sourceToken: source.id,
      providerRaw: JSON.stringify(data),
      paymentProvider: paymentProvider.CHECKOUT,
    };

    const existingCardTokens = await this.context.customerCardToken
      .getAllByCustomer(customerId)
      .count('id');
    if (existingCardTokens.count === 0) {
      cardToken.isDefault = true;
    }

    return this.context.customerCardToken.save(cardToken);
  }

  // tried to make it as generic as possible
  async getPaymentStatus(id, countryCode) {
    this.setClient(countryCode);
    return this.client.payments.get(id);
  }

  async getSaveCardPaymentStatus({ id, countryCode }) {
    const paymentResponse = await this.getPaymentStatus(id, countryCode);
    // reference is eg. SAVE_CARD#uuid_v4
    const reference = String(paymentResponse.reference).split('#');
    // reference[0] denotes SAVE_CARD /event type
    const customerId = reference[1];
    return {
      customerId,
      paymentResponse,
    };
  }

  async paymentStatus({ id, countryCode }) {
    const response = {
      id: null,
      referenceOrderId: null,
      paymentStatus: paymentStatusName.PAYMENT_PENDING,
      orderType: null,
      rawResponse: null,
      error: null,
    };
    let pOrderType = null;
    try {
      this.setClient(countryCode);
      const rawResponse = await this.client.payments.get(id);
      response.id = rawResponse.id;
      // rawResponse.reference = ORDER_SET#49613224-3450-4996-9c71-a1449a2c1f6a
      const reference = String(rawResponse.reference).split('#');
      response.referenceOrderId = reference[1] || null;
      response.orderType = reference[0] || null;
      pOrderType = reference[0];
      response.rawResponse = rawResponse;
      response.paymentStatus = !rawResponse.approved
        ? paymentStatusName.PAYMENT_FAILURE
        : rawResponse.status === 'Voided'
          ? paymentStatusName.PAYMENT_CANCELED
          : paymentStatusName.PAYMENT_SUCCESS;
      if (!rawResponse.approved && !rawResponse.actions) {
        response.rawResponse.actions = await this.client.actions.getActions(id);
      }
    } catch (err) {
      this.context.kinesisLogger.sendLogEvent(err, 'checkout-paymentStatusError');
      console.log(err);
      response.error = err;
    }
    if (pOrderType !== 'ECOM') {
      await this.context.paymentServiceLog.savePaymentLog({
        paymentService: paymentProviders.CHECKOUT,
        requestType: paymentLogsRequestType.GET_PAYMENT_STATUS,
        orderType: response.orderType,
        referenceOrderId: response.referenceOrderId,
        request: {
          id,
          countryCode,
        },
        response,
      });
    }
    return response;
  }

  async getSubscriptionAutoRenewalData(rawResponse, countryCode) {
    this.setClient(countryCode);
    const payment = await this.client.payments.get(rawResponse.id);
    if (!payment?.metadata?.subscriptionAutoRenewal) {
      return null;
    }

    const customerCardToken = await this.context.customerCardToken
      .getBySourceToken(payment.source.id);
    const metadata = JSON.parse(payment.metadata.subscriptionAutoRenewal);
    return {
      ...metadata,
      paymentId: payment.id,
      customerCardTokenId: customerCardToken.id,
      subscriptionOrderId: String(payment.reference).split('#')[1],
      paymentStatus: payment.approved
        ? paymentStatusName.PAYMENT_SUCCESS
        : paymentStatusName.PAYMENT_FAILURE
    };
  }

  async cancelAuthorizedPayment(
    { countryCode, providerPaymentId, orderType, referenceOrderId }
  ) {
    this.setClient(countryCode);
    try {
      const payment = await this.client.payments.void(
        providerPaymentId,
        {
          reference: `${orderType}#${referenceOrderId}`
        }
      );
      return {status: true, payment};
    } catch (error) {
      this.context.kinesisLogger.sendLogEvent(
        {countryCode, providerPaymentId, error: JSON.stringify(error)},
        'checkout-void-a-payment-error'
      ).catch(error => console.error(error));
      return {status: false};
    }
  }

  getCofePaymentError(response) {
    const {
      approved,
      response_code: providerCode,
      response_summary: providerDescription
    } = response;

    if (approved) return;

    if (providerCode) {
      return {
        ...findErrorCode(providerCode),
        providerDescription
      };
    }

    if (
      response['3ds']
      && (!response.actions || response.actions.length === 0)
    ) {
      return findErrorCode(response['3ds']['authentication_response']);
    }
    if (response.actions) {
      // first element is the last action. You can see that in API Reference.
      const providerCode = response.actions[0]['response_code'];
      const providerDescription = response.actions[0]['response_summary'];
      return {
        ...findErrorCode(providerCode),
        providerDescription
      };
    }
    return cofePaymentErrors.UNSPECIFIED_ERRORS;
  }
}

module.exports = CheckoutCom;
