const axios = require('axios');
const parsePhoneNumber = require('libphonenumber-js');
const {
  orderPaymentMethods,
  paymentStatusName, paymentProvider, customerCardSaveStatus,
} = require('../../schema/root/enums');
const {
  paymentSchemes,
  paymentProviders,
  paymentLogsRequestType,
} = require('../enums');
const { tap: tapConfig, basePath } = require('../../../config');
const {
  formatError, getClientFromHeader, checkMinRequiredClientVersion
} = require('../../lib/util');
const { kinesisEventTypes } = require('../../lib/aws-kinesis-logging');
const SlackWebHookManager = require('../../schema/slack-webhook-manager/slack-webhook-manager');

class Tap {
  constructor(context) {
    this.context = context;
  }

  getClient(countryCode) {
    return axios.create({
      baseURL: tapConfig.gatewayUrl,
      headers: {
        Authorization: `Bearer ${tapConfig[countryCode].secretKey}`,
      }
    });
  }

  getRedirectURL({ countryCode, type = 'payment' }) {
    return `${basePath}/tap/${countryCode.toLowerCase()}/${type}-callback`;
  }

  getWebhookURL({ countryCode }) {
    return `${basePath}/tap/${countryCode.toLowerCase()}/webhook`;
  }

  async getPaymentMethods({ customerId, countryCode, platform }) {
    //if (platform === 'ECOM') return [];
    let savedCards = [];
    const client = getClientFromHeader(this.context.req.headers);
    if (
      (
        client.os === 'ios'
        && checkMinRequiredClientVersion(this.context.req.headers, '6.9.8.0')
      ) || (
        client.os === 'android'
        && checkMinRequiredClientVersion(this.context.req.headers, '110900000')
      )
    ) {
      savedCards = (
        await this.context.customerCardToken
          .getAllAsPaymentMethod(customerId, paymentProvider.TAP)
      ).map(savedCard => {
        savedCard.sourceId = `tap#${savedCard.customerCardToken.sourceToken}`;
        return savedCard;
      });
    } else {
      savedCards = await this.getCustomerSavedCards(
        customerId,
        countryCode
      );
    }
    const cardName = 'VISA / MASTER' + (
      client.os === 'ios'
        ? ' / APPLE PAY'
        : client.os === 'android'
          ? ' / GPAY' : ''
    );
    const cardNameAr = 'فيزا / ماستر' + (
      client.os === 'ios'
        ? ' / دفع التفاح'
        : client.os === 'android'
          ? ' / جوجل باي' : ''
    );
    const paymentMethods = [...savedCards];
    if (
      (
        client.os === 'ios'
        && !checkMinRequiredClientVersion(this.context.req.headers, '6.9.8.0')
      ) || (
        client.os === 'android'
        && !checkMinRequiredClientVersion(this.context.req.headers, '110900000')
      )
    ) {
      paymentMethods.push({
        id: orderPaymentMethods.CARD,
        identifier: paymentSchemes.CARD,
        name: cardName,
        nameAr: cardNameAr,
        nameTr: cardName,
        sourceId: 'tap#src_card',
      });
    }
    if (countryCode === 'KW') {
      paymentMethods.push({
        id: orderPaymentMethods.CARD,
        identifier: paymentSchemes.KNET,
        name: 'KNET',
        nameAr: 'كي نت',
        nameTr: 'KNET',
        sourceId: 'tap#src_kw.knet',
      });
    } else if (countryCode === 'SA') {
      paymentMethods.push({
        id: orderPaymentMethods.CARD,
        identifier: paymentSchemes.MADA,
        name: 'MADA',
        nameAr: 'MADA',
        nameTr: 'MADA',
        sourceId: 'tap#src_sa.mada',
      });
    }
    if (
      tapConfig.isApplePayEnabled
      && client.os === 'ios'
      && countryCode === 'KW'
      && checkMinRequiredClientVersion(this.context.req.headers, '6.9.8.0')
    ) {
      paymentMethods.push({
        id: paymentSchemes.APPLE_PAY,
        identifier: paymentSchemes.APPLE_PAY,
        name: 'Apple Pay',
        nameAr: 'Apple Pay',
        nameTr: 'Apple Pay',
      });
    }
    if (
      tapConfig.isGooglePayEnabled
      && client.os === 'android'
      && countryCode === 'KW'
      && checkMinRequiredClientVersion(this.context.req.headers, '110900000')
    ) {
      paymentMethods.push({
        id: paymentSchemes.GOOGLE_PAY,
        identifier: paymentSchemes.GOOGLE_PAY,
        name: 'GPay',
        nameAr: 'GPay',
        nameTr: 'GPay',
      });
    }
    if (
      (
        client.os === 'ios'
        && checkMinRequiredClientVersion(this.context.req.headers, '6.9.8.0')
      ) || (
        client.os === 'android'
        && checkMinRequiredClientVersion(this.context.req.headers, '110900000')
      )
    ) {
      paymentMethods.push({
        id: paymentSchemes.ADD_CARD,
        identifier: paymentSchemes.ADD_CARD,
        name: 'Add Credit Card',
        nameAr: 'اضافة بطاقة ائتمان',
        nameTr: 'Kredi Kartı Ekle',
        isUsableForAutoRenewal: false,
      });
    }
    return paymentMethods;
  }

  getConfig(countryCode) {
    const client = getClientFromHeader(this.context.req.headers);
    return {
      publicKey: tapConfig[countryCode].publicKey[client.os]
        || tapConfig[countryCode].publicKey.default,
    };
  }

  getPaymentToken(countryCode, cardToken, customerToken) {
    return this.getClient(countryCode)
      .post('tokens', {
        'saved_card': {
          'card_id': cardToken,
          'customer_id': customerToken
        }
      })
      .then(({ data }) => data.id);
  }

  async createTapCustomer(customerId, countryCode, customerInformation) {
    const { data: response } = await this.getClient(countryCode)
      .post('customers', customerInformation);
    await this.saveCustomerToken(countryCode, {
      customer: response,
    });
    return {
      customerId,
      countryCode,
      customerToken: response.id,
    };
  }

  async pay(data) {
    const requestData = { ...data };
    try {
      const customer = await this.context.customer.getById(data.customerId);
      const phoneNumber = parsePhoneNumber(customer.phoneNumber);
      const customerInformation = {
        'first_name': customer.firstName,
        'last_name': customer.lastName,
        'email': customer.email,
        'phone': {
          'country_code': phoneNumber.countryCallingCode,
          'number': phoneNumber.nationalNumber
        }
      };
      let tapCustomer = await this.context.tapCustomer.get({
        customerId: customer.id,
        countryCode: data.countryCode
      });
      if (!tapCustomer) {
        tapCustomer = await this.createTapCustomer(
          customer.id,
          data.countryCode,
          customerInformation
        );
      }
      customerInformation.id = tapCustomer.customerToken;
      Object.assign(requestData, {
        'currency': data.currencyCode,
        'save_card': false,
        'receipt': {
          'email': false,
          'sms': false,
        },
        'customer': {
          'id': tapCustomer?.customerToken,
          'first_name': customer.firstName,
          'last_name': customer.lastName,
          'email': customer.email,
          'phone': {
            'country_code': phoneNumber.countryCallingCode,
            'number': phoneNumber.nationalNumber
          }
        },
        'post': {
          'url': this.getWebhookURL(data),
        },
        'redirect': {
          'url': this.getRedirectURL(data)
        }
      });
      if (data.paymentScheme === paymentSchemes.SAVED_CARD) {
        await this.validateCustomerSavedCard(
          customer.id,
          data.countryCode,
          data.sourceId,
        );
        requestData.source.id = await this.getPaymentToken(
          data.countryCode,
          data.source.id,
          tapCustomer.customerToken,
        );
      } else {
        // 3ds can be disabled for only saved cards
        requestData.threeDSecure = true;
      }
      const { data: response } = await this.getClient(data.countryCode)
        .post('charges', requestData, {
          headers: {
            'lang_code': customer.preferredLanguage,
          }
        });
      await this.log(
        paymentLogsRequestType.EXECUTE_PAYMENT,
        requestData,
        response
      );
      return {
        id: response.id,
        paymentUrl: response.transaction.url,
        isDirectPayment: response.status !== 'INITIATED',
        approved: response.status === 'CAPTURED',
        rawResponse: response,
        error: response.status === 'DECLINED' ? response : undefined
      };
    } catch (error) {
      await this.log(
        paymentLogsRequestType.EXECUTE_PAYMENT,
        requestData,
        error?.response?.data || { error }
      );
      return formatError(
        error?.response?.data?.errors || ['server error, please check logs'],
        { requestData, error }
      );
    }
  }

  async getCustomerSavedCards(customerId, countryCode) {
    const tapCustomer = await this.context.tapCustomer.get({
      customerId,
      countryCode
    });
    if (!tapCustomer) return [];
    try {
      const response = await this.getClient(countryCode)
        .get(`card/${tapCustomer.customerToken}`);
      return response.data.data.map(card => {
        const expMonth = card['exp_month']
          .toString()
          .padStart(2, '0');
        return {
          id: orderPaymentMethods.CARD,
          name: card.scheme,
          identifier: paymentSchemes.SAVED_CARD,
          sourceId: `tap#${card.id}`,
          subText: `**** ${card['last_four']} | Expiry: ${expMonth}/${card['exp_year']}`,
        };
      });
    } catch (error) {
      this.context.kinesisLogger.sendLogEvent({
        tapCustomer,
        error,
      }, 'tap-customerSavedCardsError').catch(err => console.error(err));
      return [];
    }
  }

  async validateCustomerSavedCard(customerId, countryCode, sourceId) {
    const savedCards = await this.getCustomerSavedCards(
      customerId,
      countryCode
    );
    const card = savedCards.find(card => card.sourceId === sourceId);
    if (!card) {
      this.context.kinesisLogger.sendLogEvent(
        {
          request: this.context.req.body,
          user: this.context.req.user
        },
        kinesisEventTypes.fraudDetection
      ).catch(err => console.log(err));
      throw new Error('Wrong card token');
    }
  }

  async paymentStatus(data) {
    try {
      const response = await this.getClient(data.countryCode)
        .get(`charges/${data.id}`);
      await this.log(
        paymentLogsRequestType.GET_PAYMENT_STATUS,
        {
          ...data,
          orderType: response?.data?.metadata?.orderType || null,
          referenceOrderId: response?.data?.metadata?.referenceOrderId || null,
        },
        response.data,
      );
      return {
        id: response.data.id,
        orderType: response?.data?.metadata?.orderType || null,
        referenceOrderId: response?.data?.metadata?.referenceOrderId || null,
        rawResponse: response.data,
        paymentStatus: response.data.status === 'CAPTURED'
          ? paymentStatusName.PAYMENT_SUCCESS
          : paymentStatusName.PAYMENT_FAILURE
      };
    } catch (error) {
      this.context.kinesisLogger.sendLogEvent({
        ...data,
        error,
      }, 'tap-paymentStatusError').catch(err => console.error(err));
      await this.log(
        paymentLogsRequestType.GET_PAYMENT_STATUS,
        data,
        error?.response?.data || { error },
      );
      return { error };
    }
  }

  async getSaveCardPaymentStatus(data) {
    try {
      const response = await this.getClient(data.countryCode)
        .get(`card/verify/${data.id}`);
      return response.data;
    } catch (error) {
      SlackWebHookManager.sendTextToSlack(
        `
[!!!TAPPayment-Error!!!]
Request: authorize/${data.id}
Error: ${JSON.stringify(error?.response?.data || error)}
`).catch(err => console.error(err));
      this.context.kinesisLogger.sendLogEvent({
        ...data,
        error: error?.response?.data || error,
      }, 'tap-getSaveCardPaymentStatusError').catch(err => console.error(err));
      return error?.response?.data;
    }
  }

  async saveCustomerToken(countryCode, rawResponse) {
    const customerToken = rawResponse?.customer?.id;
    if (customerToken) {
      const customer = await this.context.customer.getByPhoneNumber(
        Object.values(rawResponse.customer.phone).join('')
      );
      await this.context.tapCustomer.saveIfNotExist(
        customer.id,
        countryCode,
        customerToken
      );
    }
  }

  async saveCardTokenWithVerification(data) {
    const { token, customerId, countryIsoCode } = data;

    // get customer information
    const customer = await this.context.customer.getById(customerId);
    const phoneNumber = parsePhoneNumber(customer.phoneNumber);
    const customerInformation = {
      'first_name': customer.firstName,
      'last_name': customer.lastName,
      'email': customer.email,
      'phone': {
        'country_code': phoneNumber.countryCallingCode,
        'number': phoneNumber.nationalNumber
      }
    };
    let tapCustomer = await this.context.tapCustomer.get({
      customerId: customer.id,
      countryCode: countryIsoCode
    });
    if (!tapCustomer) {
      tapCustomer = await this.createTapCustomer(
        customer.id,
        data.countryIsoCode,
        customerInformation
      );
    }
    customerInformation.id = tapCustomer.customerToken;

    // get country information
    const country = await this.context.country.getByCode(countryIsoCode);
    const currency = await this.context.currency.getById(country.currencyId);

    try {
      const response = await this.getClient(countryIsoCode)
        .post('card/verify', {
          'currency': currency.isoCode,
          'threeDSecure': true,
          'save_card': true,
          'customer': customerInformation,
          'metadata': {
            customerId
          },
          'source': {
            'id': token
          },
          'redirect': {
            'url': this.getRedirectURL({
              countryCode: countryIsoCode,
              type: 'card-verification'
            })
          }
        });
      return {
        requiresRedirect: true,
        saveStatus: customerCardSaveStatus.ADDITIONAL_VERIFICATION_NEEDED,
        redirectUrl: response?.data?.transaction?.url,
      };
    } catch (error) {
      this.context.kinesisLogger.sendLogEvent(
        {
          ...data,
          error: error?.response?.data || { error },
        },
        'tap-saveCardTokenWithVerificationError')
        .catch(err => console.error(err));
      return {
        requiresRedirect: false,
        saveStatus: customerCardSaveStatus.CARD_SAVE_FAILED,
      };
    }
  }

  async saveCard(data) {
    const {customerId, saveCardResponse} = data;
    const cardToken = {
      type: saveCardResponse.card.object,
      expiryMonth: saveCardResponse.card.expiry.month,
      expiryYear: saveCardResponse.card.expiry.year,
      name: saveCardResponse.card.name,
      scheme: saveCardResponse.source.payment_method,
      last4: saveCardResponse.card.last_four,
      bin: saveCardResponse.card.first_six,
      cardType: saveCardResponse.source.payment_type,
      issuer: saveCardResponse.card_issuer.name,
      issuerCountry: saveCardResponse.card_issuer.country,
      customerId,
      customerToken: saveCardResponse.customer.id,
      sourceToken: saveCardResponse.card.id,
      providerRaw: JSON.stringify(saveCardResponse),
      paymentProvider: paymentProvider.TAP,
    };

    const existingCardTokens = await this.context.customerCardToken
      .getAllByCustomer(customerId)
      .count('id');
    if (existingCardTokens.count === 0) {
      cardToken.isDefault = true;
    }

    return this.context.customerCardToken.save(cardToken);
  }

  async removeCardFromTap({customerToken, sourceToken}) {
    try {
      const tapCustomer = await this.context.tapCustomer.get({customerToken});
      await this.getClient(tapCustomer.countryCode).delete(
        `card/${customerToken}/${sourceToken}`
      );
    } catch (error) {
      SlackWebHookManager.sendTextToSlack(
        `
[!!!TAPPayment-Error!!!]
Request: [DELETE] card/${customerToken}/${sourceToken}
Error: ${JSON.stringify(error?.response?.data || error)}
`).catch(err => console.error(err));
    }
  }

  async getCustomerSavedCardTokens(customerId) {
    return this.context.customerCardToken.getAllByCustomerAndProvider(
      customerId,
      paymentProvider.TAP
    );
  }

  log(requestType, request, response) {
    return this.context.paymentServiceLog.savePaymentLog({
      paymentService: paymentProviders.TAP,
      requestType,
      orderType: request?.metadata?.orderType ||
        response?.metadata?.orderType || null,
      referenceOrderId: request?.metadata?.referenceOrderId ||
        response?.metadata?.referenceOrderId || null,
      request,
      response,
    });
  }
}

module.exports = Tap;
