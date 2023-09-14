const axios = require('axios');
const querystring = require('querystring');
const { extend, has } = require('lodash');
const {
  knet: {
    request: knetRequestConfig,
    gatewayUrl: knetUrl,
    enableLogging: logKnet,
    password,
    requestTimeout,
  },
  isTest,
} = require('../../config');

const metrics = require('./metrics');

/**
 * Initialize KNET payment.
 * @param  {currency} amount, payment amount
 * @param  {string} trackId, locally generated tracking id
 * @returns { Promise {
 * error: string, any error that occured.. likely meaning other fields are blank
 * paymentId: string, knet generated paymentId
 * trackId: string, local tracking id
 * url: string, payment web view url to provide to customer } }
 */
function initiatePayment(amount, trackId, orderType) {
  const requestData = extend({}, knetRequestConfig, {
    action: '1',
    amt: Number(amount).toFixed(3),
    trackId,
    udf1: orderType,
  });

  // In prod, knet expects the password to be in a field called 'passwordhash'
  const passwordField = isTest
    ? 'password'
    : knetUrl.indexOf('test') > -1
      ? 'password'
      : 'passwordhash';

  requestData[passwordField] = password;

  if (logKnet)
    console.log('Sending KNET Request:\n', querystring.stringify(requestData));

  return axios
    .post(knetUrl, querystring.stringify(requestData), {
      timeout: requestTimeout,
    })
    .then(response => {
      const { data } = response;

      if (logKnet) {
        console.log('KNET Response:\n', data);
      }

      if (data.toLowerCase().indexOf('error') > -1) {
        const result = {
          error: data.substring(0, 1024),
        };
        metrics.knetInitiatePaymentFailure(result);
        return result;
      }
      const ix = response.data.indexOf(':');
      const paymentId = data.substring(0, ix);
      const urlPart = data.substring(ix + 1);
      const parsedResponse = {
        paymentId,
        trackId,
        url: `${urlPart}PaymentID=${paymentId}`,
      };
      if (logKnet) console.log('KNET Response parsed as: \n', parsedResponse);
      metrics.knetInitiatePaymentSuccess(parsedResponse);
      return parsedResponse;
    })
    .catch(async err => {
      const getLoggableErrData = () => {
        if (has(err, 'response.status')) {
          return `${err.response.status}, ${err.response.statusText}`;
        }
        return `Exception contacting KNET: ${err}`;
      };
      const errData = getLoggableErrData();
      if (logKnet) {
        console.log(errData);
      }
      metrics.knetInitiatePaymentFailure(errData);
      return {
        error: err.toString().substring(0, 1024),
      };
    });
}

module.exports = {
  initiatePayment,
};
