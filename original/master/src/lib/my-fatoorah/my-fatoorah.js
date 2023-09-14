const qs = require('querystring');
const axios = require('axios');
const moment = require('moment');
const { includes, sortBy, snakeCase } = require('lodash');
const { v4: UUIDv4 } = require('uuid');

const {
  buildAbsoluteUrl,
  formatError,
  getClientFromHeader,
  checkMinRequiredClientVersion
} = require('../util');
const { myFatoorah, isTest } = require('../../../config');
const {
  paymentStatusName,
  paymentServices,
} = require('../../schema/root/enums');

const Money = require('../currency');

// TODO Change this to "PaymentMethodCode": "md" check

const enabledPaymentMethods = [
  2, // VISA/MASTER
  3, // AMEX
  12, // STC PAY - on testing it is 14
];

function log(...t) {
  let showLogs = true;
  if (isTest) {
    showLogs = false;
  }
  if (!showLogs) {
    return null;
  }
  console.log(`[${new Date().toISOString()}] MyFatoorah log >>`, ...t);
}

function dbLog({
  orderType = null,
  referenceOrderId = null,
  requestType,
  request,
  response,
  responseTime,
}) {
  return this.db('payment_service_logs').insert({
    id: UUIDv4(),
    paymentService: paymentServices.MY_FATOORAH,
    orderType,
    referenceOrderId,
    requestType,
    request,
    response,
    responseTime,
  });
}

function getRequestHeaders(mfConfig) {
  return {
    Authorization: 'Bearer ' + mfConfig.apiKey,
    'Content-Type': 'application/json',
  };
}

async function initiateGatewayRequest(currencyCode, countryCode) {
  const { db } = this;
  const mfConfig = myFatoorah[countryCode.toString().toUpperCase()];
  if (!mfConfig) {
    return {
      error: `MyFatoorah config for country ${countryCode} not found`,
    };
  }

  const [currency] = await db('currencies').where(
    'iso_code',
    currencyCode.toString().toUpperCase()
  );
  if (!currency) {
    return {
      error: `Currency code ${currencyCode} not accepted`,
    };
  }

  const [country] = await db('countries').where({
    status: 'ACTIVE',
    // eslint-disable-next-line camelcase
    iso_code: countryCode.toString().toUpperCase(),
  });
  if (!country) {
    return {
      error: `Country code ${countryCode} not accepted`,
    };
  }

  return {
    currency,
    country,
    mfConfig,
  };
}

async function initiatePayment(
  db,
  { amount, currencyCode, countryCode, platform },
  context
) {
  if (!amount || !currencyCode || !countryCode) {
    return formatError([
      'MyFatoorah initiate payment - requires amount, currency ISO code and country ISO Code',
    ]);
  }

  const { currency, mfConfig, error } = await initiateGatewayRequest.apply(
    { db },
    [currencyCode, countryCode]
  );

  if (error) {
    return formatError([error], { amount, currencyCode, countryCode });
  }

  const client = getClientFromHeader(context.req.headers);

  amount = new Money(
    amount,
    currency.decimalPlace,
    currency.lowestDenomination
  ).toCurrencyValue();

  const requestData = {
    InvoiceAmount: amount,
    CurrencyIso: currencyCode,
  };
  const startTime = moment().valueOf();

  return axios
    .post(`${mfConfig.gatewayUrl}/v2/InitiatePayment`, requestData, {
      headers: getRequestHeaders(mfConfig),
      timeout: mfConfig.requestTimeout,
    })
    .then(async response => {
      const responseTime = moment().valueOf() - startTime;
      await dbLog.apply({ db }, [
        {
          requestType: 'InitiatePayment',
          request: requestData,
          response: response.data,
          responseTime,
        },
      ]);
      return response;
    })
    .then(response => {
      const { data } = response;
      if (data.IsSuccess) {
        const paymentMethods = [];
        const firstPaymentMethods = [];
        // console.log(JSON.stringify(data, null, 2));
        data.Data.PaymentMethods.map(pm => {
          const paymentMethod = {
            id: pm.PaymentMethodId,
            name: pm.PaymentMethodEn,
            nameAr: pm.PaymentMethodAr,
            nameTr: pm.PaymentMethodTr,
            serviceCharge: pm.ServiceCharge,
            totalAmount: pm.TotalAmount,
            directPayment: pm.IsDirectPayment,
            identifier: snakeCase(pm.PaymentMethodEn).toUpperCase(),
          };
          if (
            (
              pm.PaymentMethodId === 1
              && countryCode === 'KW'
            ) || // include KNET only for KW and ECOM
            (pm.PaymentMethodId === 6 && countryCode === 'SA') || // include MADA only for SA
            (pm.PaymentMethodId === 6 && countryCode === 'AE') || // include Debit Cards UAE only for AE
            // include Apple Pay only for KW
            // if ios version is equal or higher than '6.8.4.1' it will work
            // because older versions are using checkout.com to pay with ApplePay
            (
              client.os === 'ios'
              && pm.PaymentMethodId === 24 && countryCode === 'KW'
              && checkMinRequiredClientVersion(context.req.headers, '6.8.5.1')
            )
          ) {
            firstPaymentMethods.push(paymentMethod);
          } else if (
            includes(enabledPaymentMethods, pm.PaymentMethodId)
          ) {
            paymentMethods.push(paymentMethod);
          }
          return pm;
        });

        if (includes(['KW', 'AE'], countryCode)) {
          return [...firstPaymentMethods, ...paymentMethods];
        }

        // display STC Pay first after Credits / Cash
        return sortBy([...firstPaymentMethods, ...paymentMethods], fpm => {
          return fpm.id === 12 ? -1 : 1;
        });
      }
      log(data.Message, data.ValidationErrors);
      return formatError([data.Message]);
    })
    .catch(err => {
      return formatError(['server error, please check logs'],
        { requestData, err });
    });
}

async function executePayment(
  db,
  {
    paymentMethod,
    amount,
    currencyCode,
    language = 'en',
    referenceOrderId,
    countryCode,
    orderType,
    customerPhoneNumber
  }
) {
  if (
    !paymentMethod ||
    !amount ||
    !language ||
    !referenceOrderId ||
    !orderType ||
    !countryCode
  ) {
    log(
      paymentMethod,
      amount,
      currencyCode,
      language,
      referenceOrderId,
      countryCode,
      orderType
    );
    return formatError([
      'MyFatoorah execute payment - requires paymentMethod, amount, currencyCode, language, referenceOrderId, orderType and countryCode',
    ]);
  }
  const { currency, mfConfig, error } = await initiateGatewayRequest.apply(
    { db },
    [currencyCode, countryCode]
  );
  if (error) {
    return formatError([error]);
  }

  amount = new Money(
    amount,
    currency.decimalPlace,
    currency.lowestDenomination
  ).toCurrencyValue();

  // 24 is APPLE_PAY_KWD for Kuwait
  // apple pays are executed in mobile sdk so we return directly here
  if (paymentMethod === '24') {
    await dbLog.apply({ db }, [
      {
        orderType,
        referenceOrderId,
        requestType: 'InitiatePayment',
        request: {
          CurrencyIso: currencyCode.toString().toUpperCase(),
          InvoiceAmount: amount,
          PaymentMethodId: paymentMethod,
        },
      },
    ]);
    return {
      approved: false
    };
  }

  const requestData = {
    PaymentMethodId: paymentMethod,
    InvoiceValue: amount,
    DisplayCurrencyIso: currencyCode.toString().toUpperCase(),
    Language: language.toString().toLowerCase(),
    CustomerReference: referenceOrderId,
    CallBackUrl: buildAbsoluteUrl(
      `/mf/${countryCode.toLowerCase()}/${currencyCode.toLowerCase()}/payment-callback`
    ),
    ErrorUrl: buildAbsoluteUrl(
      `/mf/${countryCode.toLowerCase()}/${currencyCode.toLowerCase()}/payment-callback`
    ),
    UserDefinedField: qs.stringify({ orderType }),
  };
  if (paymentMethod === '1') {
    /**
     * https://apitest.myfatoorah.com/swagger/ui/index#!/Payment/Payment_ExecutePayment
     * For Customer Mobile max length is 11 and also there is a regex
     */
    customerPhoneNumber = customerPhoneNumber.replace(/\+/g, '');
    const regex = /^(?:(\+)|(00)|(\\*)|())[0-9]{3,14}((\\#)|())$/;
    if (customerPhoneNumber.match(regex) && customerPhoneNumber.length <= 11) {
      requestData.CustomerMobile = customerPhoneNumber;
    }
  }
  const startTime = moment().valueOf();
  return axios
    .post(`${mfConfig.gatewayUrl}/v2/ExecutePayment`, requestData, {
      headers: getRequestHeaders(mfConfig),
      timeout: mfConfig.requestTimeout,
    })
    .then(async response => {
      const responseTime = moment().valueOf() - startTime;
      await dbLog.apply({ db }, [
        {
          orderType,
          referenceOrderId,
          requestType: 'ExecutePayment',
          request: requestData,
          response: response.data,
          responseTime,
        },
      ]);
      return response;
    })
    .then(response => {
      const { data } = response;
      if (data.IsSuccess) {
        return {
          id: `${data.Data.InvoiceId}`,
          paymentUrl: data.Data.PaymentURL,
          isDirectPayment: data.Data.IsDirectPayment,
          rawResponse: data,
        };
      }
      log(data.Message, data.ValidationErrors);
      return formatError([data.Message]);
    })
    .catch(err => {
      return formatError(['server error, please check logs'],
        { requestData, err });
    });
}

async function paymentEnquiry(db, { id, type, countryCode, currencyCode }) {
  const { mfConfig } = await initiateGatewayRequest.apply({ db }, [
    currencyCode,
    countryCode,
  ]);
  const requestData = {
    Key: id,
    KeyType: type,
  };
  const startTime = moment().valueOf();
  return axios
    .post(`${mfConfig.gatewayUrl}/v2/GetPaymentStatus`, requestData, {
      headers: getRequestHeaders(mfConfig),
      timeout: mfConfig.requestTimeout,
    })
    .then(async response => {
      const responseTime = moment().valueOf() - startTime;
      let orderType = null;
      let referenceOrderId = null;
      if (response.data.Data) {
        orderType = qs.parse(response.data.Data.UserDefinedField).orderType;
        referenceOrderId = response.data.Data.CustomerReference;
      }
      await dbLog.apply({ db }, [
        {
          orderType,
          referenceOrderId,
          requestType: 'GetPaymentStatus',
          request: requestData,
          response: response.data,
          responseTime,
        },
      ]);
      return response;
    })
    .then(response => {
      const { data } = response;
      if (data.IsSuccess) {
        const { orderType } = qs.parse(data.Data.UserDefinedField);
        return {
          id: data.Data.InvoiceId,
          referenceOrderId: data.Data.CustomerReference,
          paymentStatus:
            data.Data.InvoiceStatus === 'Paid'
              ? paymentStatusName.PAYMENT_SUCCESS
              : paymentStatusName.PAYMENT_FAILURE,
          orderType,
          rawResponse: data.Data,
        };
      }
      log(data.Message, data.ValidationErrors);
      return formatError([data.Message]);
    })
    .catch(err => {
      return formatError(['server error, please check logs'],
        { requestData, err });
    });
}

module.exports = {
  initiatePayment,
  executePayment,
  paymentEnquiry,
};
