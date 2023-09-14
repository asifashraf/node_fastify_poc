const axios = require('axios');
const querystring = require('querystring');
const {
  get,
  has,
  includes,
  isNil,
  isString,
  isObject,
  toNumber,
} = require('lodash');
const {
  isTest,
  flickConfig: {
    flickBaseURL,
    orderEndpoint,
    authEndpoint,
    devToken,
    username: flickUsername,
    password: flickPassword,
    enableLogging: logFlick,
  },
} = require('../../config');

/**
 * Returns a token from the cache (DB). If token from DB is empty gets a new one (and caches it) from the Flick API.
 * @returns String
 */
async function getPartnerToken(context) {
  const partnerToken = await context.flickToken.getToken();
  if (isNil(partnerToken)) {
    if (logFlick)
      console.log('Auth partner token is inexistent, getting a new one...');
    return getNewPartnerToken(context);
  }
  return partnerToken.partnerToken;
}

/**
 * Generates a new token and caches it to DB.
 * @returns String
 */
async function getNewPartnerToken(context) {
  return generatePartnerToken().then(newPartnerToken => {
    if (logFlick)
      console.log('Flick: Saving new partnerToken: \n', newPartnerToken);
    return context.flickToken.saveToken(newPartnerToken);
  });
}

function getLoggableErrData(err) {
  if (has(err, 'response.status')) {
    return `${err.response.status}, ${err.response.statusText}`;
  }
  return `Exception contacting Flick: ${err}`;
}

/**
 *  Generates a new partnerToken using Flick's API and returns it.
 * @returns Object
 */
function generatePartnerToken() {
  return axios
    .post(`${flickBaseURL}${authEndpoint}`, {
      username: flickUsername,
      password: flickPassword,
      developer: devToken,
    })
    .then(response => {
      const { data } = response;
      const { result } = data;
      const { partnerToken } = get(data, 'data', null);

      if (logFlick) console.log('Flick: Got new partnerToken:\n', partnerToken);

      if (result !== true || partnerToken === null) {
        throw new Error('Error getting auth partner token.\n', data);
      }
      return partnerToken;
    })
    .catch(async err => {
      const errData = getLoggableErrData(err);
      if (logFlick) console.log(errData);
      return {
        error: err.toString().substring(0, 1024),
      };
    });
}

/**
 *  Returns a new request with the given partnerToken, should the previous call returns a 401 or 402 error.
 * @returns Object
 */
function retryRequest(axiosRequest, requestConfig, partnerToken) {
  if (logFlick)
    console.log('Flick: Retrying request with this token:\n', partnerToken);

  requestConfig.headers.partnerToken = partnerToken;
  if (logFlick) console.log('Flick: New URL:\n', requestConfig.url);
  return axiosRequest.request(requestConfig);
}

/**
 * filterAPIResponse returns the response's data as an object or throws an error if it can parse the response.
 * On error, the API is currently dumping the error _before_ the JSON string like this block below.
 * In that case, this function attempts to read the JSON from that response.
 * File: <br />/var/www/sandbox.flickapp.me/site/classes/MySQL.php<br /><br />Line: <br />296 <br />
 * <br />Message: <br />Duplicate entry \'25-aecda996-94d7-43f5-9cfe-031496b4845d\' for key \'OrderPartnerID\' <br />
 * <br />Trace: <br />#0 /var/www/sandbox.flickapp.me/site/classes/Thing.php(721): MySQL->insert(\'Orders\', Array)\n
 * #1 /var/www/sandbox.flickapp.me/site/classes/Order.php(413): Thing->persist()\n
 * #2 /var/www/sandbox.flickapp.me/site/api/v1/order.php(107): Order->add(Array)\n
 * #3 {main}{"result":false,"code":999,"message":"Duplicate entry \'25-aecda996-94d7-43f5-9cfe-031496b4845d\' for key \'OrderPartnerID\'","jsonapi":{"version":1},"debug":{"benchmark":{"elapsedTime":"54ms","memoryPeak":"2.00Mb","memoryUsage":"2.00Mb"}}}' }
 * @returns Object
 */
function filterAPIResponse(response) {
  const { data } = response;
  if (isObject(data)) {
    return data;
  }
  try {
    return JSON.parse(data.substr(data.indexOf('{"result')));
  } catch (err) {
    if (logFlick)
      console.log(
        'Flick: Could not read JSON from response. Throwing error. Data:\n',
        data
      );
    throw new Error('Flick: Response is not a valid JSON');
  }
}

/**
 * filterResponse
 * Filters a Flick response, looking for expired or invalid tokens or other errors.
 *
 * @param {object} response
 * @param {object} context
 * @param {object} axiosRequest
 * @returns Object
 */
function filterResponse(response, context, axiosRequest) {
  const data = filterAPIResponse(response);
  const { result, message } = data;
  const code = toNumber(data.code);
  if (logFlick) console.log('Flick data:', data);

  if (result === false) {
    const expiredOrInvalidTokenCodes = [401, 402, 403];

    if (includes(expiredOrInvalidTokenCodes, code)) {
      console.log('Flick: Error: parnerToken is expired or invalid.');
      return getNewPartnerToken(context).then(partnerToken => {
        return retryRequest(axiosRequest, response.config, partnerToken);
      });
    } else if (code === 999) {
      console.log('Flick: Duplicate Entry key Error: ', message);
    } else {
      console.log('Flick: Error: ', message);
    }
  }

  return response;
}

/**
 * Makes a request to Flick and retries if there's an expired or invalid token.
 * Returns the data of the response.
 * @returns Object
 */
async function flickRequest(endpoint, body, context) {
  if (logFlick) console.log('Flick: flickRequest');

  const partnerToken = await getPartnerToken(context);
  if (logFlick) console.log(`Flick: Using Partner token: ${partnerToken}`);

  // Needed to prevent re-stringify on retry
  const axiosRequest = axios.create({
    headers: {
      locale: 'en_BH',
      partnerToken,
    },
    transformRequest: [
      data => (isString(data) ? data : querystring.stringify(data)),
    ],
  });

  axiosRequest.interceptors.response.use(
    response => {
      /** We need to intercept the response because the API returns HTTP status code 200
       * regardless of the result and token validity or expiration status.
       */
      return filterResponse(response, context, axiosRequest);
    },
    error => {
      /** We intercept any error and look for expired or invalitd tokens.
       * If we have an expired or invalitd token, it fetches a new token and retries.
       */
      filterResponse(error, context, axiosRequest);
      return Promise.reject(error);
    }
  );

  const requestResult = await axiosRequest
    .post(`${flickBaseURL}${endpoint}`, body)
    .then(response => {
      const responseData = get(response, 'data', {});
      const { result, message } = responseData;
      const { data } = responseData;

      if (result !== true) {
        throw new Error('Flick: Result is not True: ', message);
      }
      if (logFlick) console.log('Flick: Data:\n', data);
      return data;
    });

  return requestResult;
}

/**
 * Creates a Flick order.
 * @param  {object} orderInfo as provided by orderSet.getInfoForDelivery
 * @returns
 */
async function createFlickOrder(orderInfo, context) {
  if (logFlick) console.log('Flick: Creating flickOrder...');
  if (isTest)
    return {
      id: 15666,
      partnerReferenceID: orderInfo.partnerReferenceID,
      deliveryStatus: 'unassigned',
      creationDate: new Date().toISOString(),
    };

  const extraFields = {
    action: 'add',
    paymentGateway: 'online',
    paymentMethod: 'creditCard',
    paymentStatus: 'paid',
  };
  const body = { ...orderInfo, ...extraFields };
  if (logFlick) console.log('Flick: Order Body:\n', body);

  const data = await flickRequest(orderEndpoint, body, context);
  return data;
}

module.exports = {
  createFlickOrder,
};
