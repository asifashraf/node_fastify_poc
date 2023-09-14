const {
  readdirSync,
  lstatSync,
  readFileSync,
  createWriteStream,
} = require('fs');
/* eslint-disable no-constant-condition */
const { join: pathJoin } = require('path');
const querystring = require('querystring');
const assert = require('assert');
const chalk = require('chalk');
const boxen = require('boxen'); // tilt.jpg
const moment = require('moment');
const {
  mapKeys,
  snakeCase,
  camelCase,
  isArray,
  keys,
  map,
  first,
  extend,
  get,
  forEach,
  compact,
  find,
} = require('lodash');
const crypto = require('crypto');
const nanoid = require('nanoid');
const {
  isTest,
  timezone,
  loyaltyTierConfig,
  loyaltyTopUpSku,
  basePath,
  redis: redisConfig,
} = require('../../config');
const { DateTime } = require('luxon');
const {
  paymentStatusOrderType,
  orderPaymentMethods,
  creditsPaymentMethods,
} = require('../schema/root/enums');
const axios = require('axios') ;
const kinesisLogger = require('./aws-kinesis-logging');
const os = require('os');
function getDirectories(srcpath) {
  return readdirSync(srcpath).filter(file =>
    lstatSync(pathJoin(srcpath, file)).isDirectory()
  );
}

function displayServer(server) {
  if (!process?.argv?.includes('localDev')) {
    SlackWebHookManager.sendTextToSlack(`[APP_STARTED][${os.hostname()}]`)
  }
  if (process.env.NODE_ENV !== 'development') return;

  const details = server.address();
  const localURL = `http://localhost:${details.port}`;

  let message = chalk.green('Express is running!');
  message += '\n\n';
  message += `• ${localURL}`;

  console.log(
    boxen(message, {
      padding: 1,
      margin: 1,
      borderColor: 'green',
    })
  );
}

// Add a header for the current server time
function serverTimeMiddleware(req, res, next) {
  res.set(
    'SERVER-TIME',
    moment()
      .utc()
      .toISOString()
      .split('.')[0] + 'Z'
  );
  next();
}

function addPaging(query, paging, defaultLimit) {
  const limit = get(paging, 'limit', defaultLimit);
  const offset = get(paging, 'offset', 0);

  if (typeof limit !== 'undefined') {
    query.limit(limit);
  }
  if (typeof offset !== 'undefined') {
    query.offset(offset);
  }

  return query;
}

function validateCSVFileColumns(columnsGiven, requiredColumns) {
  if (!Array.isArray(columnsGiven) || !Array.isArray(requiredColumns)) {
    return true;
  }
  let missing = false;
  forEach(requiredColumns, c => {
    if (columnsGiven.indexOf(c) === -1) {
      missing = true;
    }
  });
  return missing;
}

function transformToSnakeCase(data) {
  const snakeCaseObj = obj => {
    const dataWithSnakeCase = mapKeys(obj, (value, key) => snakeCase(key));
    keys(obj).forEach(key => {
      delete obj[key];
    });

    keys(dataWithSnakeCase).forEach(key => {
      obj[key] = dataWithSnakeCase[key];
    });

    return obj;
  };

  return isArray(data) ? map(data, snakeCaseObj) : snakeCaseObj(data);
}

function objTransformToCamelCase(obj) {
  mapKeys(obj, (value, key) => {
    const newKey = camelCase(key);
    delete obj[key];
    obj[newKey] = value;
  });
  return obj;
}

function transformToCamelCase(data) {
  assert(isArray(data), 'Must be an array of objects');
  return data.map(obj => objTransformToCamelCase(obj));
}

// Generates a random, six-character, uppercased, alpha-numeric short code.
function generateShortCode(length) {
  // The following character set omits some letters (B,I,O,Q,S,Z) to avoid confusion from similar numeric symbols (8,1,0,0,5,2).
  const characterSet = 'ACDEFGHJKLMNPRTUVWXY0123456789';
  // The number of possible short codes = characterSet.length ^ shortCodeLength,
  // In our case, that's 30^6 = 729M.
  const shortCodeLength = length || 6;
  const generate = nanoid.customAlphabet(characterSet, shortCodeLength);
  return generate();
}

// isJson
function isJSON(str) {
  try {
    return JSON.parse(str) && Boolean(str);
  } catch (err) {
    // console.log('util isJSON', err);
    return false;
  }
}
function jsonToObject(str) {
  if (typeof str === 'object') {
    return str;
  } else if (typeof str === 'string' && isJSON(str)) {
    return JSON.parse(str);
  }
  return {};
}

// Track our uuid generating function to allow overriding with a deterministic generator for testing
const isUUID = require('is-uuid');
const { v4: UUIDv4 } = require('uuid');
const uuid = { get: UUIDv4, validate: isUUID.v4 };
function setUuidFn(fn) {
  uuid.get = fn;
}

// Track our current time generating function to allow overriding with a deterministic generator for testing
const now = { get: () => new Date().toISOString() };
function setNowFn(fn) {
  now.get = fn;
}
function formatError(errorData, data) {
  kinesisLogger.sendLogEvent({ errorData, data }, 'global-formatError-error');

  const errors = [];
  if (errorData.length > 0) {
    errors.push(...errorData);
  } else if (get(errorData, 'errors', []).length > 0) {
    errors.push(...errorData.errors);
  } else if (errorData.error) {
    errors.push(...errorData.error);
  }

  return formatErrorResponse(errors);
}

function formatErrorResponse(errors) {
  return {
    error: first(errors),
    errors,
  };
}

function extendAll(collection, obj) {
  return map(collection, item => extend({}, item, obj));
}

const appendSortOrderToList = (list, groupingField, sortOrderField) => {
  let lastId = null;
  let sortOrder = null;

  forEach(list, (item, key) => {
    if (get(item, 'deleted', false) === false) {
      if (lastId === get(item, groupingField, undefined)) {
        sortOrder++;
      } else {
        sortOrder = 1;
      }
    }
    item[sortOrderField] = sortOrder;
    list[key] = item;
    lastId = get(item, groupingField, null);
  });

  return list;
};

const connectionString = isTest
  ? redisConfig.testConnection
  : redisConfig.connection;
const { RedisPubSub } = require('graphql-redis-subscriptions');
const Redis = require('ioredis');
const SlackWebHookManager = require('../schema/slack-webhook-manager/slack-webhook-manager');
const pubsub = {
  instance: null,
  init() {
    if (this.instance === null)
      this.instance = new RedisPubSub({
        publisher: new Redis(connectionString),
        subscriber: new Redis(connectionString),
      });
  },
};

// Used for configuring luxon DateTime objects
const dateTimeConfig = {
  obj: {
    zone: timezone,
  },
};
function setDateTimeConfig(obj) {
  dateTimeConfig.obj = obj;
}

function toDateWithTZ(date, startOrEndOfDay, timeZoneIdentifier = timezone) {
  const iso = date.format('YYYY-MM-DD');

  const withTZ = DateTime.fromISO(iso).setZone(timeZoneIdentifier);

  if (startOrEndOfDay === 'end') {
    return withTZ.endOf('day').toISO();
  }
  return withTZ.startOf('day').toISO();
}

async function getReferenceIdFromKnetResponse(knetBody, context, model) {
  let { trackid: referenceOrderId } = knetBody;
  const { paymentid: merchantId } = knetBody;

  if (!referenceOrderId && !merchantId) {
    console.log(
      'Missing trackid-referenceOrderId, paymentid-merchantId',
      knetBody
    );
    throw new Error(`Missing required KNET params [${model}]`);
  }

  let isValidReference = false;

  try {
    if (referenceOrderId) {
      referenceOrderId = referenceOrderId.toLowerCase();
      isValidReference = await context[model].isValid({
        id: referenceOrderId,
      });
    } else if (merchantId) {
      const referenceOrder = await context[model].getByMerchantId(merchantId);

      if (referenceOrder) {
        isValidReference = true;
        referenceOrderId = referenceOrder.id;
      } else {
        isValidReference = false;
      }
    }
  } catch (err) {
    console.log('Failed Validating Order Set', err);
  }

  if (!isValidReference) {
    console.log('Invalid referenceOrderId', knetBody);
    throw new Error(`Unable to find referencing order [${model}]`);
  }

  return referenceOrderId;
}

async function publishSubscriptionEvent(context, orderSetId, event) {
  context.pubsub.init();
  const orderSet = await context.orderSet.getById(orderSetId);
  const brandLocation = await context.brandLocation.getById(
    orderSet.brandLocationId
  );
  return context.pubsub.instance.publish(event, {
    brandLocationId: orderSet.brandLocationId,
    brandId: brandLocation.brandId,
    orderSetId,
    orderSet,
    event,
  });
}

async function publishStoreOrderSetSubscriptionEvent(
  context,
  storeOrderSetId,
  event
) {
  context.pubsub.init();
  return context.pubsub.instance.publish(event, {
    storeOrderSetId,
    event,
  });
}

async function publishStoreOrderSubscriptionEvent(
  context,
  storeOrderId,
  event
) {
  context.pubsub.init();
  return context.pubsub.instance.publish(event, {
    storeOrderId,
    event,
  });
}

async function publishMposSubscriptionEvent(context, order, event) {
  context.pubsub.init();
  return context.pubsub.instance.publish(event, {
    order,
    event,
  });
}

async function publishArrivedOrderSubscriptionEvent(context, order, event) {
  context.pubsub.init();
  return context.pubsub.instance.publish(event, {
    order,
    event,
  });
}

async function publishOperatingHoursChangingSubscriptionEvent(context, event, weeklySchedule, exception, brandId, brandLocationId) {
  context.pubsub.init();
  return context.pubsub.instance.publish(event, {
    brandId,
    brandLocationId,
    weeklySchedule,
    exception,
    event,
  });
}

function getDomainFromEmail(email) {
  return email.replace(/.*@/, '').toLowerCase();
}

function getloyaltyTierBySku(sku) {
  if (sku === loyaltyTopUpSku) {
    // Return a Mocked Object of the Loyalty Top Up Tier
    return {
      name: loyaltyTopUpSku,
      amount: '0',
      colorTint: '',
      bonus: '0',
      benefits: [],
      sku: loyaltyTopUpSku,
    };
  }

  return loyaltyTierConfig.find(tier => {
    return tier.sku === sku;
  });
}

function getloyaltyTierByName(name) {
  return loyaltyTierConfig.find(tier => {
    return tier.name === name;
  });
}

function getModelNameByType(type) {
  if (type === paymentStatusOrderType.ORDER_SET) {
    return 'orderSet';
  } else if (type === paymentStatusOrderType.LOYALTY_ORDER) {
    return 'loyaltyOrder';
  } else if (type === paymentStatusOrderType.GIFT_CARD_ORDER) {
    return 'giftCardOrder';
  } else if (type === paymentStatusOrderType.STORE_ORDER_SET) {
    return 'storeOrderSet';
  } else if (type === paymentStatusOrderType.SUBSCRIPTION_ORDER) {
    return 'cSubscriptionOrder';
  }
}

async function getOrderTypeAndIdFromPaymentId(context, merchantId) {
  console.log('merchantId', merchantId);

  const query = `select id,type from (
                    select 'ORDER_SET' as type,merchant_id,id from order_sets where merchant_id is not null and merchant_id = :merchantId
                    UNION
                    select 'LOYALTY_ORDER' as type,merchant_id,id from loyalty_orders where merchant_id is not null and merchant_id = :merchantId
                  ) as sq`;

  return context.db
    .raw(query, { merchantId })
    .then(result => transformToCamelCase(result.rows))
    .then(first);
}

function formatNumberForDinars(value) {
  return Number.parseFloat(value).toFixed(3);
}

function gitRevision() {
  const gitDir = `${process.cwd()}/.git`;
  const revision = readFileSync(`${gitDir}/HEAD`);
  if (revision.indexOf(':') === -1) {
    // detatched HEAD
    return revision;
  }
  const path = revision
    .toString()
    .substring(5)
    .replace(/\s+/, '');
  return readFileSync(`${gitDir}/${path}`).toString();
}

function toGateAddress({ airportName, terminalNumber, gateNumber }) {
  return compact([airportName, terminalNumber, gateNumber]).join('\n');
}

function getPaymentStatus({ result }) {
  return result === 'CAPTURED' ? 'PAYMENT_SUCCESS' : 'PAYMENT_FAILURE';
}

const buildAbsoluteUrl = (relativePath = '/', params = {}) => {
  relativePath =
    relativePath.charAt(0) === '/' ? relativePath : `/${relativePath}`;
  let absoluteUrl = `${basePath}${relativePath}`;
  if (Object.keys(params).length > 0) {
    absoluteUrl += `?${querystring.stringify(params)}`;
  }
  return absoluteUrl;
};

const orderSetPaymentMethod = collection => {
  function addPaymentMethod(orderSetItem) {
    if (orderSetItem.paymentMethod) {
      return orderSetItem;
    }
    const { creditsUsed, cashOnDelivery } = orderSetItem;
    let paymentMethod = null;
    switch (true) {
      case creditsUsed:
        paymentMethod = orderPaymentMethods.CREDITS;
        break;
      case cashOnDelivery:
        paymentMethod = orderPaymentMethods.CASH;
        break;
      default:
        paymentMethod = orderPaymentMethods.KNET;
    }
    orderSetItem.paymentMethod = paymentMethod;
    return orderSetItem;
  }
  if (!collection) {
    return collection;
  }
  if (isArray(collection)) {
    return map(collection, addPaymentMethod);
  }
  return addPaymentMethod(collection);
};

const creditsPaymentMethod = collection => {
  function addPaymentMethod(creditsItem) {
    if (creditsItem.paymentMethod) {
      return creditsItem;
    }
    creditsItem.paymentMethod = creditsPaymentMethods.KNET;
    return creditsItem;
  }
  if (!collection) {
    return collection;
  }
  if (isArray(collection)) {
    return map(collection, addPaymentMethod);
  }
  return addPaymentMethod(collection);
};

const consumePerk = (perkType, coupon, quantity, perks, consumedPerks) => {
  const perk = find(perks, t => {
    if (coupon) {
      return t.type === perkType && t.coupon;
    }
    return t.type === perkType && !t.coupon;
  });
  consumedPerks.push({ ...perk, quantity });
  perks = compact(
    perks.map(usePerk => {
      if (usePerk.type === perkType && usePerk.coupon === coupon) {
        usePerk.quantity -= quantity;
      }
      if (usePerk.quantity === 0) {
        return null;
      }
      return usePerk;
    })
  );
  return perks;
};

const roundNumber = (number, decimals = 0) => {
  return Number(
    Math.round(parseFloat(number) + 'e' + decimals) + 'e-' + decimals
  );
};

const capitalize = text => {
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const langs = ['ar', 'tr'];
const addLocalizationProp = (obj, field) => {
  const translations = {};
  if (
    Object.prototype.hasOwnProperty.call(obj, field) &&
    (typeof obj[field] === 'string' || obj[field] === null)
  ) {
    translations.en = obj[field];
    if (obj[field] === null) translations.en = '';
    delete obj[field];
    for (let i = 0; i < langs.length; i++) {
      if (
        Object.prototype.hasOwnProperty.call(
          obj,
          field + capitalize(langs[i])
        ) &&
        (typeof obj[field + capitalize(langs[i])] === 'string' ||
          obj[field + capitalize(langs[i])] === null)
      ) {
        translations[langs[i]] = obj[field + capitalize(langs[i])];
        if (translations[langs[i]] === null) translations[langs[i]] = '';
        delete obj[field + capitalize(langs[i])];
      }
    }
    obj[field] = translations;
  }

  return obj;
};

const addLocalizationField = (obj, field) => {
  if (!obj) {
    return null;
  }
  if (Array.isArray(obj))
    for (let i = 0; i < obj.length; i++)
      obj[i] = addLocalizationProp(obj[i], field);
  else obj = addLocalizationProp(obj, field);
  return obj;
};

const removeLocalizationProp = (obj, field) => {
  if (
    Object.prototype.hasOwnProperty.call(obj, field) &&
    typeof obj[field] === 'object'
  ) {
    for (let i = 0; i < langs.length; i++)
      obj[field + capitalize(langs[i])] = obj[field][langs[i]];
    obj[field] = obj[field].en;
  }
  return obj;
};

const removeLocalizationField = (obj, field) => {
  if (Array.isArray(obj))
    for (let i = 0; i < obj.length; i++)
      obj[i] = removeLocalizationProp(obj[i], field);
  else obj = removeLocalizationProp(obj, field);
  return obj;
};

const addLocalizationMultipleFields = (obj, fields) => {
  if (!obj) {
    return null;
  }
  for (let j = 0; j < fields.length; j++) {
    const field = fields[j];
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++)
        obj[i] = addLocalizationProp(obj[i], field);
    } else obj = addLocalizationProp(obj, field);
  }
  return obj;
};

const removeLocalizationMultipleProps = (obj, fields) => {
  for (let j = 0; j < fields.length; j++) {
    const field = fields[j];
    if (
      Object.prototype.hasOwnProperty.call(obj, field) &&
      typeof obj[field] === 'object'
    ) {
      for (let i = 0; i < langs.length; i++)
        obj[field + capitalize(langs[i])] = obj[field][langs[i]];
      obj[field] = obj[field].en;
    }
  }
  return obj;
};

const removeLocalizationMultipleFields = (obj, fields) => {
  if (Array.isArray(obj))
    for (let i = 0; i < obj.length; i++)
      obj[i] = removeLocalizationMultipleProps(obj[i], fields);
  else obj = removeLocalizationMultipleProps(obj, fields);
  return obj;
};

const addIconsToPaymentMethods = paymentMethods => {
  const icons = {
    [orderPaymentMethods.CASH]:
      'https://cloudinary-cofeapp.s3.eu-west-1.amazonaws.com/payment-methods/Cash.png',
    [orderPaymentMethods.CREDITS]:
      'https://cloudinary-cofeapp.s3.eu-west-1.amazonaws.com/payment-methods/COFECredits.png',
    '1':
      'https://cloudinary-cofeapp.s3.eu-west-1.amazonaws.com/payment-methods/Knet.png', // KNET
    KNET:
      'https://cloudinary-cofeapp.s3.eu-west-1.amazonaws.com/payment-methods/Knet.png', // KNET
    '2':
      'https://cofe-app-uploads.s3-eu-west-1.amazonaws.com/payment-methods/VisaMastercard.png', // VISA/MASTER
    VISA_MASTER:
      'https://cofe-app-uploads.s3-eu-west-1.amazonaws.com/payment-methods/VisaMastercard.png', // VISA/MASTER
    VISA:
      'https://cloudinary-cofeapp.s3.eu-west-1.amazonaws.com/payment-methods/Visa.png',
    MASTERCARD:
      'https://cloudinary-cofeapp.s3.eu-west-1.amazonaws.com/payment-methods/Mastercard.png',
    '3':
      'https://cloudinary-cofeapp.s3.eu-west-1.amazonaws.com/payment-methods/Amex.png', // AMEX
    AMEX:
      'https://cloudinary-cofeapp.s3.eu-west-1.amazonaws.com/payment-methods/Amex.png', // AMEX
    '6':
      'https://cloudinary-cofeapp.s3.eu-west-1.amazonaws.com/payment-methods/MADA.png', // MADA
    MADA:
      'https://cloudinary-cofeapp.s3.eu-west-1.amazonaws.com/payment-methods/MADA.png', // MADA
    '6_UAE':
      'https://cofe-app-uploads.s3-eu-west-1.amazonaws.com/payment-methods/uaecc.png', // Debit Cards UAE
    UAE_DEBIT_CARDS:
      'https://cofe-app-uploads.s3-eu-west-1.amazonaws.com/payment-methods/uaecc.png', // Debit Cards UAE
    '12':
      'https://cofe-app-uploads.s3-eu-west-1.amazonaws.com/payment-methods/STCPay.png', // SA STC Pay
    STC_PAY:
      'https://cofe-app-uploads.s3-eu-west-1.amazonaws.com/payment-methods/STCPay.png', // SA STC Pay
    ADD_CC:
      'https://cofe-app-uploads.s3-eu-west-1.amazonaws.com/payment-methods/CreditCard.png',
  };

  return paymentMethods.map(paymentMethod => {
    if (paymentMethod.imageUrl) return paymentMethod;

    paymentMethod.imageUrl = icons[paymentMethod.identifier];
    if (paymentMethod.customerCardToken) {
      paymentMethod.imageUrl =
        icons[paymentMethod.customerCardToken.scheme.toUpperCase()];
    }
    if (paymentMethod.name === 'Debit Cards UAE') {
      paymentMethod.imageUrl = icons['6_UAE'];
    }
    return paymentMethod;
  });
};

const legacyPaymentMethodStub = {
  id: 'legacy',
  name: {
    en: 'legacy',
    ar: 'legacy',
  },
  serviceCharge: '0.000',
  totalAmount: '0.000',
  currencyId: 'f216d955-0df1-475d-a9ec-08cb6c0f92bb',
  directPayment: false,
  legacyPaymentMethod: true,
};

const fileLog = (filename, data) => {
  const tmpDir = `${__dirname}/../../tmp`;
  const logStream = createWriteStream(`${tmpDir}/${filename}`, { flags: 'a' });
  logStream.write(data.toString());
  logStream.close();
};

const cloneObject = object => JSON.parse(JSON.stringify(object));

const errorLog = (...messages) => {
  if (isTest) {
    return null;
  }

  return console.error(`[${moment().toISOString()}]`, ...messages);
};
const mapPaymentMethod = paymentId => {
  let paymentMethod = paymentId;
  switch (paymentId) {
    case '1':
      paymentMethod = 'KNET';
      break;
    case '2':
      paymentMethod = 'VISA';
      break;
    case '3':
      paymentMethod = 'AMEX';
      break;
    case '12':
      paymentMethod = 'STC Pay';
      break;
    default:
      break;
  }
  return paymentMethod;
};

const isAndroid = src => {
  if (src) {
    src = src.toLowerCase();
    return src.indexOf('android') !== -1;
  }
  return false;
};

const isIOS = src => {
  if (src) {
    src = src.toLowerCase();
    return src.indexOf('ios') !== -1;
  }
  return false;
};

const isBuildBefore = (version, olderThan) => {
  if (version && olderThan) {
    version = Number(String(version).replace(/\D/g, ''));
    olderThan = Number(String(olderThan).replace(/\D/g, ''));
    if (!isNaN(version) && !isNaN(olderThan)) {
      return version < olderThan;
    }
  }
  return false;
};

const isNullOrUndefined = value => {
  return value === undefined || value === null;
};

const generateRandomIntWithLength = length => {
  return Math.floor(
    Math.pow(10, length - 1) + Math.random() * 9 * Math.pow(10, length - 1)
  );
};

const hashObject = object => {
  const hash = crypto
    .createHash('md5')
    .update(
      JSON.stringify(object, function (k, v) {
        if (k[0] === '_') return undefined;
        // remove api stuff
        else if (typeof v === 'function')
          // consider functions
          return v.toString();
        return v;
      })
    )
    .digest('hex');
  return hash;
};

const hashString = val => {
  const hash = crypto
    .createHash('md5')
    .update(val)
    .digest('hex');
  return hash;
};

if (!Array.prototype.flat) {
  // eslint-disable-next-line no-extend-native
  Object.defineProperty(Array.prototype, 'flat', {
    value(depth = 1) {
      return this.reduce(function (flat, toFlatten) {
        return flat.concat(
          Array.isArray(toFlatten) && depth > 1
            ? toFlatten.flat(depth - 1)
            : toFlatten
        );
      }, []);
    },
  });
}

function isValidColorCode(colorCode) {
  return colorCode.length === 7 && colorCode.startsWith('#');
}

function validateEmail(elementValue) {
  const emailPattern = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
  return emailPattern.test(elementValue);
}

function getClientFromHeader(headers) {
  return {
    os: headers['x-app-os'] || null,
    version: parseInt(
      (headers['x-app-version'] || '')
        .split('.')
        .map((item) => parseInt(item))
        .join('')
    ),
  };
}

function createInstanceWithBaseUrl(
  baseUrl,
  additionalConfig
) {
  if (!additionalConfig) {
    return axios.create({
      baseURL: baseUrl,
    });
  }
  return axios.create({
    baseURL: baseUrl,
    ...additionalConfig,
  });
}

function checkMinRequiredClientVersion(headers, minRequiredVersion) {
  const clientVersion = headers['x-app-version'];
  if (!clientVersion) return false;
  const clientVersionArr = clientVersion.split('.');
  const minVersionArr = minRequiredVersion.split('.');

  for (let i = 0; i < Math.max(clientVersionArr.length, minVersionArr.length); i++) {
    const clientPart = parseInt(clientVersionArr[i]) || 0;
    const minPart = parseInt(minVersionArr[i]) || 0;

    if (clientPart > minPart) {
      return true;
    } else if (clientPart < minPart) {
      return false;
    }
  }
  return true;
}

async function getAuthUser(context) {
  const auth = context.auth;
  const admin = await context.admin.getByAuthoId(auth.id);
  return {
    adminId: admin.id,
    adminEmail: admin.email
  };
}

/**
 * get localized data from database row
 * which consist by multilingual json fields
 * @param {Object} data - database row
 * @param {"EN" | "AR" | "TR"} language="EN" - selected lang to be translated
 * @param {[String]} fields - multilingual fields
 * @returns {Object}
 */
const getLocalizedData = (data, language = 'EN', fields) => {
  for (const fieldName of fields) {
    data[fieldName] = getLocalizedValue(data[fieldName], language);
  }
  return data;
};

/**
 * get localized value from multilingual json field
 * @param {Object} value - multilingual database field
 * @param {"EN" | "AR" | "TR"} language="EN" - selected lang to be translated
 * @returns {String}
 */
const getLocalizedValue = (value, language = 'EN') => {
  return value[language.toLowerCase()] || value['en'];
};

const rtlAndLtrTextConversion = (lang, message) => {
  let converterString = '';
  lang = lang.toLowerCase();
  switch (lang) {
    case 'en':
      converterString = `${'\u202A' + message + '\u202C'}`;
      break;
    case 'ar':
      converterString = `${'\u202B' + message + '\u202C'}`;
      break;
    default:
      converterString = `${'\u202A' + message + '\u202C'}`;
  }
  return converterString;
};

const getXWeeksAgoFullDate = (weeksAgo) => {
  return moment(Date.now()).subtract(weeksAgo, "weeks").format('YYYY-MM-DD HH:mm:ss');
}

module.exports = {
  getLocalizedData,
  getLocalizedValue,
  getClientFromHeader,
  checkMinRequiredClientVersion,
  uuid,
  setUuidFn,
  now,
  setNowFn,
  getDirectories,
  displayServer,
  serverTimeMiddleware,
  addPaging,
  objTransformToCamelCase,
  transformToCamelCase,
  transformToSnakeCase,
  generateShortCode,
  formatError,
  extendAll,
  appendSortOrderToList,
  pubsub,
  dateTimeConfig,
  setDateTimeConfig,
  getXWeeksAgoFullDate,
  toDateWithTZ,
  getReferenceIdFromKnetResponse,
  publishSubscriptionEvent,
  publishStoreOrderSetSubscriptionEvent,
  publishStoreOrderSubscriptionEvent,
  publishMposSubscriptionEvent,
  publishArrivedOrderSubscriptionEvent,
  publishOperatingHoursChangingSubscriptionEvent,
  getDomainFromEmail,
  getloyaltyTierBySku,
  getloyaltyTierByName,
  formatErrorResponse,
  getModelNameByType,
  hashObject,
  getOrderTypeAndIdFromPaymentId,
  formatNumberForDinars,
  gitRevision,
  toGateAddress,
  getPaymentStatus,
  buildAbsoluteUrl,
  orderSetPaymentMethod,
  creditsPaymentMethod,
  consumePerk,
  roundNumber,
  addLocalizationField,
  addLocalizationMultipleFields,
  removeLocalizationField,
  removeLocalizationMultipleFields,
  addIconsToPaymentMethods,
  legacyPaymentMethodStub,
  validateCSVFileColumns,
  fileLog,
  isJSON,
  jsonToObject,
  cloneObject,
  errorLog,
  mapPaymentMethod,
  isNullOrUndefined,
  generateRandomIntWithLength,
  isBuildBefore,
  isAndroid,
  isIOS,
  isValidColorCode,
  validateEmail,
  hashString,
  getAuthUser,
  rtlAndLtrTextConversion,
  createInstanceWithBaseUrl
};
