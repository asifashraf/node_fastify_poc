const axios = require('axios');

const { paymentStatusName } = require('../../schema/root/enums');
const {
  buildAbsoluteUrl,
  isNullOrUndefined,
  generateRandomIntWithLength,
} = require('../../lib/util');
const { paymentLogsRequestType, paymentProviders } = require('../enums');
const { mobileExpressConfig } = require('../../../config');

class MobileExpress {
  constructor(context) {
    this.context = context;

    this.REQUEST_TIMEOUT = 20000;
    this.CALLBACK_PATH = '/mobile-express/payment-callback';
    this.IS_USE_INSTALLMENTS_ALLOWED = false;
    this.IS_USE_LOYALTY_POINTS_ALLOWED = false;
    this.THREE_D_SECURE_MODE = 'Mandatory'; // options : "None,Mandatory,Optional,Optional3DSelected"
    this.UI_VIEW_TYPE = 'Medium'; // options : "Full,Medium,Compact"
  }

  getRequestHeaders(mobileExpressConfig) {
    return {
      Authorization: mobileExpressConfig.authorizationKey,
      MerchantCode: mobileExpressConfig.merchantCode,
      'Content-type': 'application/json',
    };
  }

  getAllowedCurrencyTypes() {
    return [
      'TRY',
      // 'EUR',
      // 'USD',
      // 'GBP',
      // 'JPY',
    ];
  }

  getAllowedPaymentInstruments() {
    return [
      // 'StoredCard',
      'NewCard',
      // 'BKMExpress',
      // 'GarantiPay',
      // 'MaximumMobil',
      // 'Emoney',
      // 'WireTransfer'
    ];
  }

  generateCallbackURL() {
    return buildAbsoluteUrl(this.CALLBACK_PATH);
  }

  generateRandomTurkishNumber() {
    const firstThreeNumbers = ['505', '535', '545'];
    const selectedFirstThree =
      firstThreeNumbers[generateRandomIntWithLength(1) % 3];
    const middleFourNumbers = generateRandomIntWithLength(4).toString();
    const finalThreeNumbers = generateRandomIntWithLength(3).toString();
    return selectedFirstThree
      .concat(middleFourNumbers)
      .concat(finalThreeNumbers);
  }

  formatCustomerPhoneNumberWithFallback(phoneNumber) {
    if (isNullOrUndefined(phoneNumber)) {
      return generateRandomIntWithLength(10); // Mobile Express Requires 10 digit number
    }
    const cleanedNumber = phoneNumber.replace('+', '').replace(' ', ''); // remove starting + , and remove space between country code and number part
    if (!cleanedNumber.startsWith('90')) {
      return this.generateRandomTurkishNumber();
    }

    const purePhoneNumber = cleanedNumber.slice(2);
    if (purePhoneNumber.length !== 10) {
      return this.generateRandomTurkishNumber();
    }
    return purePhoneNumber;
  }

  generatePlaceholderEmail() {
    return 'somevalidemail@cofeapp.com';
  }

  preparePaymentRequestBody({ data, customer }) {
    return {
      orderId: data.referenceOrderId,
      merchantCustomField: data.orderType, // we use merchantCustom field for keeping orderType
      customerInfo: {
        email: this.generatePlaceholderEmail(), // customer.email,
        customerId: customer.id,
        name: `${customer.firstName} ${customer.lastName}`,
        phone: this.formatCustomerPhoneNumberWithFallback(customer.phoneNumber),
      },
      uiDesignInfo: {
        viewType: this.UI_VIEW_TYPE,
        designType: 0,
      },
      totalAmount: data.amount,
      currency: 'TRY', // data.currencyCode,
      paymentInstruments: this.getAllowedPaymentInstruments(),
      paymentInstrumentInfo: {
        card: {
          processType: 'sales',
          useInstallments: this.IS_USE_INSTALLMENTS_ALLOWED,
          useLoyaltyPoints: this.IS_USE_LOYALTY_POINTS_ALLOWED,
          newCard: {
            threeDSecureMode: this.THREE_D_SECURE_MODE,
            useIVRForCardEntry: false,
          },
        },
      },
      returnUrl: this.generateCallbackURL(),
    };
  }

  async pay(paymentData) {
    const response = {
      id: null,
      error: null,
      rawResponse: null,
      paymentUrl: null,
    };
    try {
      const mobileExpressResponse = await this.startHostedPaymentProcess(
        paymentData
      );
      const rawResponse = mobileExpressResponse.data;
      const errorFromValidation = this.validateHostedPaymentProcessResponse(
        rawResponse
      );
      response.rawResponse = rawResponse;
      if (errorFromValidation) {
        response.error = errorFromValidation;
        return response;
      }
      response.rawResponse = rawResponse;
      response.id = rawResponse.systemTransId;
      response.paymentUrl = rawResponse.redirectURL;
    } catch (err) {
      console.log(err);
      response.error = err;
    }
    await this.context.paymentServiceLog.savePaymentLog({
      paymentService: paymentProviders.MOBILE_EXPRESS,
      requestType: paymentLogsRequestType.EXECUTE_PAYMENT,
      orderType: paymentData.merchantCustomField,
      referenceOrderId: paymentData.orderId,
      request: paymentData,
      response,
    });
    return response;
  }

  startHostedPaymentProcess(paymentData) {
    return axios.post(
      `${mobileExpressConfig.gatewayUrl}/StartHostedPaymentProcess`,
      paymentData,
      {
        headers: this.getRequestHeaders(mobileExpressConfig),
        timeout: this.REQUEST_TIMEOUT,
      }
    );
  }

  async getPaymentMethods(/* { customerId } */) {
    const payByCard = {
      id: 'CARD',
      identifier: 'VISA_MASTER',
      name: 'Credit Card',
      nameAr: 'اضافة بطاقة ائتمان',
      nameTr: 'Kredi Kartı',
      sourceId: 'MobileExpress',
    };
    return [payByCard];
  }

  validateHostedPaymentProcessResponse(response) {
    console.log('Mobile Express - Result ', response.result);
    console.log('Mobile Express - Result Message ', response.resultMessage);
    if (response === null || response === undefined) {
      return 'No response from Mobile Express API';
    }
    if (response.result !== 'Success') {
      return `Non Success Status : ${response.data.result}`;
    }
    if (response.redirectURL === null) {
      return 'Null Redirect Url on Success Status :';
    }
    return null;
  }

  prepareGetHostedPaymentStatusRequestBody(systemTransId, orderId) {
    return {
      systemTransId,
      orderId,
    };
  }

  getHostedPaymentStatus(requestBody) {
    return axios.post(
      `${mobileExpressConfig.gatewayUrl}/GetHostedPaymentStatus`,
      requestBody,
      {
        headers: this.getRequestHeaders(mobileExpressConfig),
        timeout: this.REQUEST_TIMEOUT,
      }
    );
  }

  async checkPaymentStatus(data) {
    const response = {
      id: null,
      referenceOrderId: null,
      paymentStatus: paymentStatusName.PAYMENT_PENDING,
      orderType: null,
      rawResponse: null,
      error: null,
    };
    const validationRequestBody = this.prepareGetHostedPaymentStatusRequestBody(
      data.systemTransId,
      data.orderId
    );
    try {
      const rawResponse = (await this.getHostedPaymentStatus(
        validationRequestBody
      )).data;
      response.id = data.systemTransId;
      response.referenceOrderId = rawResponse.processInfo.orderId || null;
      response.orderType = rawResponse.processInfo.merchantCustomField || null;
      response.rawResponse = rawResponse;
      response.paymentStatus =
        rawResponse.paymentResult === 'Success'
          ? paymentStatusName.PAYMENT_SUCCESS
          : paymentStatusName.PAYMENT_FAILURE;
    } catch (err) {
      console.log(err);
      response.error = err;
    }
    await this.context.paymentServiceLog.savePaymentLog({
      paymentService: paymentProviders.MOBILE_EXPRESS,
      requestType: paymentLogsRequestType.GET_PAYMENT_STATUS,
      orderType: response.orderType,
      referenceOrderId: response.referenceOrderId,
      request: validationRequestBody,
      response,
    });
    return response;
  }
}

module.exports = MobileExpress;
