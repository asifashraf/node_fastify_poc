require('dotenv').config({ silent: true });
const { get } = require('lodash');

// process.env lookups are extremely expensive so we cache it here
const env = Object.assign(
  { NODE_ENV: 'development', S3_MAX_FILE_UPLOAD_BYTES: 10485760 },
  process.env
);

global.secrets = global.secrets || {};

function booleanSetting(value) {
  return (
    get(env, value, '').toLowerCase().indexOf('true') > -1 ||
    get(global.secrets, value, '').toLowerCase().indexOf('true') > -1
  );
}

const loyaltyTierConfig = require('./loyalty-tier-config');
const { notificationProviders } = require('./src/notifications/enums');
const { paymentProviders } = require('./src/payment-service/enums');

const isTest = env.NODE_ENV.indexOf('test') > -1;
module.exports = {
  timezone: global.secrets.TIMEZONE || 'Asia/Kuwait',
  authyApiKey: global.secrets.AUTHY_API_KEY,
  basePath: global.secrets.BASE_PATH || '',
  env: env.NODE_ENV,
  isProd: env.NODE_ENV === 'production',
  isDev:
    env.NODE_ENV === 'development' ||
    env.NODE_ENV === 'localtest' ||
    env.NODE_ENV === 'staging',
  isTest,
  // Only used for development/testing
  defaultUserId: global.secrets.DEFAULT_USER_ID,
  defaultUserName: global.secrets.DEFAULT_USER_NAME || 'Gandalf The White',
  defaultUserEmail: global.secrets.DEFAULT_USER_EMAIL || 'gandalf@isengard.me',
  defaultUserPasswordHash:
    '$2b$15$EsOnKIiibgO.RHb/ykhtCu1x1pPiBz8Bbpg4gONRPh1Afu4rIaBZK', // we're not using password for mobile side (using sso, otp)
  mocksEnabled: booleanSetting('GRAPHQL_ENABLE_MOCKING'),
  skipSeedTestOrders: !isTest && booleanSetting('SKIP_SEED_TEST_ORDERS'),
  // Used to simulate db latency for performance testing
  simulateSelectLatency: global.secrets.SIMULATE_SELECT_LATENCY,
  countDbQueries: booleanSetting('COUNT_DB_QUERIES'),
  validateCouponRedemptionLimit:
    isTest || booleanSetting('VALIDATE_COUPON_REDEMPTION_LIMIT'),
  apiAuthToken:
    global.secrets.API_AUTH_TOKEN || '05c6a6a0-6870-4072-af1a-df1d4fd58178',
  database: {
    connection: global.secrets.DATABASE_URL,
    readOnlyConnection: global.secrets.RO_DATABASE_URL || null,
    localTestConnection:
      env.LOCALTEST_DATABASE_URL ||
      'postgres://localhost:5432/cofe-district-test',
  },
  enableSqlCache: booleanSetting('ENABLE_SQL_CACHE') || !isTest,
  redis: {
    connection: global.secrets.REDIS_CONNECTION_URL,
    testConnection: env.REDIS_TEST_CONNECTION_URL || '',
  },
  auth: {
    domain: global.secrets.AUTH_DOMAIN || '',
    clientId: global.secrets.AUTH_CLIENT_ID || '',
    clientSecret: global.secrets.AUTH_CLIENT_SECRET || '',
    extensionUrl: global.secrets.AUTH_EXTENSION_URL || '',
    defaultRoleId: global.secrets.AUTH_DEFAULT_ROLE_ID || '',
  },
  jwt: {
    accessTokenExpire: global.secrets.JWT_ACCESS_TOKEN_EXPIRE || 3600,
    refreshTokenExpire: global.secrets.JWT_REFRESH_TOKEN_EXPIRE || 86400,
    issuer: global.secrets.JWT_ISSUER || '',
    secret: global.secrets.JWT_SECRET || '',
    secretPub: global.secrets.JWT_SECRET_PUB || '',
  },
  expressDelivery: {
    riderUrl:
      global.secrets.EXPRESS_DELIVERY_RIDER_URL ||
      'https://tracking.cofeapp.com/edt/page.html',
    jwt: {
      accessTokenExpire:
        global.secrets.EXPRESS_DELIVERY_JWT_ACCESS_TOKEN_EXPIRE || 3600,
      secret: global.secrets.EXPRESS_DELIVERY_JWT_SECRET || '',
    },
    redis: {
      ttlSeconds: global.secrets.EXPRESS_DELIVERY_REDIS_TTL || 7200,
      accessTimeAfterOrderDelivered:
        global.secrets.EXPRESS_DELIVERY_ACCESS_TIME_DELIVERED || 900,
    },
    ETA: {
      outForDeliveryCountdown: global.secrets.EXPRESS_DELIVERY_PICKUP_ETA || 10,
      delayedDeliveryCountdown:
        global.secrets.EXPRESS_DELIVERY_DELAYED_ETA || 5,
    },
  },
  firebaseConfig: {
    type: global.secrets.FIREBASE_TYPE || '',
    projectId: global.secrets.FIREBASE_PROJECT_ID || '',
    privateKeyId: global.secrets.FIREBASE_PRIVATE_KEY_ID || '',
    privateKey: global.secrets.FIREBASE_PRIVATE_KEY || '',
    clientEmail: global.secrets.FIREBASE_CLIENT_EMAIL || '',
    clientId: global.secrets.FIREBASE_CLIENT_ID || '',
    authUri: global.secrets.FIREBASE_AUTH_URI || '',
    tokenUri: global.secrets.FIREBASE_TOKEN_URI || '',
    authProviderX509CertUrl:
      global.secrets.FIREBASE_AUTH_PROVIDER_X509_CERT_URL || '',
    clientX509CertUrl: global.secrets.FIREBASE_CLIENT_X509_CERT_URL || '',
  },
  firebaseScrypt: {
    memCost: global.secrets.SCRYPT_MEMCOST,
    rounds: global.secrets.SCRYPT_ROUNDS,
    saltSeparator: global.secrets.SCRYPT_SALT_SEP,
    signerKey: global.secrets.SCRYPT_SIGNER,
  },
  revelConfig: {
    url: global.secrets.REVEL_URL || '',
    key: global.secrets.REVEL_KEY || '',
    secret: global.secrets.REVEL_SECRET || '',
  },
  dynamicLinkConfig: {
    key: global.secrets.DYNAMIC_LINK_KEY || '',
    uriPrefix: global.secrets.DYNAMIC_LINK_URI_PREFIX || '',
    link: global.secrets.DYNAMIC_LINK_LINK || '',
    host: global.secrets.DYNAMIC_LINK_HOST || '',
    androidPackageName: global.secrets.DYNAMIC_LINK_ANDROID_PACKAGE_NAME || '',
    iosBundleId: global.secrets.DYNAMIC_LINK_IOS_BUNDLE_ID || '',
    appStoreId: global.secrets.DYNAMIC_LINK_IOS_APP_STORE_ID || '',
    uriPrefixForShortener:
      global.secrets.DYNAMIC_LINK_URI_PREFIX_FOR_SHORTENER || '',
  },
  oneSignalConfig: {
    userAuthKey: global.secrets.ONESIGNAL_USER_AUTH_KEY || '',
    basicKey: global.secrets.ONESIGNAL_BASIC_KEY || '',
    appId: global.secrets.ONESIGNAL_APP_ID || '',
    baseUrl: global.secrets.ONESIGNAL_BASE_URL || '',
  },
  knet: {
    enableLogging: !isTest && booleanSetting('KNET_ENABLE_LOGGING'),
    gatewayUrl: global.secrets.KNET_GATEWAY_URL,
    receiptUrl: global.secrets.KNET_RECEIPT_URL,
    password: global.secrets.KNET_PASSWORD,
    requestTimeout: global.secrets.KNET_REQUEST_TIMEOUT || 5000,
    request: {
      id: global.secrets.KNET_ID,
      currencycode: 414,
      langId: global.secrets.KNET_LANG_ID,
      responseURL: global.secrets.KNET_RESPONSE_URL,
      errorURL: global.secrets.KNET_ERROR_URL,
    },
  },
  brazeConfig: {
    brazeServiceURL: global.secrets.BRAZE_SERVICE_URL,
  },
  customerAnalyticsConfig: {
    queueName: global.secrets.CUSTOMER_ANALYTICS_SERVICE_QUEUE_NAME,
  },
  delivery: {
    enable: booleanSetting('ENABLE_DELIVERY'),
    awsAccessKeyId: global.secrets.AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: global.secrets.AWS_SECRET_ACCESS_KEY,
    sqsRegion: global.secrets.SQS_DELIVERY_REGION,
    sqsQueueUrl: global.secrets.SQS_DELIVERY_QUEUE_URL,
    deliveryServiceUrl: global.secrets.DELIVERY_SERVICE_URL,
    deliveryServiceToken: global.secrets.DELIVERY_SERVICE_TOKEN,
  },
  notifications: {
    // We want enableNotifications to be true for tests since mocking happens in pushlib to avoid sending them,
    // and because several integration tests would break otherwise.
    enableNotifications: isTest || booleanSetting('ENABLE_NOTIFICATIONS'),
    sqsRegion: global.secrets.SQS_REGION,
    sqsQueueUrl: global.secrets.SQS_QUEUE_URL,
    emailAddresses: {
      doNotReply: isTest
        ? 'do_not_reply@cofedistrict.com'
        : global.secrets.DO_NOT_REPLY_EMAIL,
      receipts: isTest
        ? 'receipts@cofedistrict.com'
        : global.secrets.SENDER_EMAIL_FOR_RECEIPTS,
      catering: isTest
        ? 'catering@cofedistrict.com'
        : global.secrets.CATERING_CONTACT_EMAIL,
    },
    provider: notificationProviders.FIREBASE_CLOUD_MESSAGING,
  },
  mpos: {
    sqsRegion: global.secrets.SQS_MPOS_ORDER_STATUS_UPDATER_QUEUE_REGION,
    sqsQueueUrl: global.secrets.SQS_MPOS_ORDER_STATUS_UPDATER_QUEUE_URL,
    slackWebHook:
      global.secrets.MPOS_WEBHOOK_URL ||
      'services/TQY240BDY/B02J424C0MV/o6S11adzscdZu9M05Lukavyx',
  },
  s3: {
    s3AccessKeyId: global.secrets.AWS_ACCESS_KEY_ID,
    s3SecretAccessKey: global.secrets.AWS_SECRET_ACCESS_KEY,
  },
  tabbyApiKey: global.secrets.TABBY_API_KEY_PUBLIC || '',
  googleMapsApiKey: global.secrets.GOOGLE_MAPS_API_KEY || '',
  googleMapsReverseGeocodeApiKey:
    global.secrets.GOOGLE_MAPS_REVERSE_GEOCODE_API_KEY || '',
  cloudinary: {
    apiKey: global.secrets.CLOUDINARY_API_KEY || '',
    apiSecret: global.secrets.CLOUDINARY_API_SECRET || '',
  },
  iOSAuth0Config: {
    apiHostname: global.secrets.IOS_AUTH0_API_HOSTNAME || '',
    apiIdentifier: global.secrets.IOS_AUTH0_API_IDENTIFIER || '', // identifier that maps to the 'API' configured in the console
    clientId: global.secrets.IOS_AUTH0_CLIENT_ID || '', // configuration for the Auth0 client mapped to the API
    realm: global.secrets.IOS_AUTH0_REALM || '', // database name that is managing the credentials we are using
  },
  apolloEngineKey: !isTest && global.secrets.APOLLO_ENGINE_KEY,
  isTracingEnabled: global.secrets.IS_GRAPHQL_TRACING_ENABLED || false,
  isCacheControlEnabled:
    global.secrets.IS_GRAPHQL_CACHE_CONTROL_ENABLED || false,
  loyaltyTierConfig,
  loyaltyTopUpSku: 'TOPUP',
  defaultMaxLimit: get(global.secrets, 'DEFAULT_MAX_LIMIT', 100),
  flickConfig: {
    enableLogging: !isTest && booleanSetting('FLICK_ENABLE_LOGGING'),
    flickBaseURL:
      global.secrets.FLICK_BASE_URL || 'http://sandbox.api.flickapp.me/v1',
    orderEndpoint: '/order.json',
    authEndpoint: '/partner.json',
    cityEndpoint: '/city.json',
    storeEndpoint: '/store.json',
    devToken: global.secrets.FLICK_DEV_TOKEN || '',
    username: global.secrets.FLICK_USERNAME || '',
    password: global.secrets.FLICK_PASSWORD || '',
    cityId: global.secrets.FLICK_CITY_ID || 1,
    courierName: 'Flick',
  },
  ccPayment: {
    gatewayUrl: global.secrets.CC_GATEWAY_URL || '',
    merchant: {
      id: global.secrets.CC_MERCHANT_ID || '',
      name: global.secrets.CC_MERCHANT_NAME || '',
      address: global.secrets.CC_MERCHANT_ADDRESS || '',
      username: global.secrets.CC_MERCAHNT_USERNAME || '',
      password: global.secrets.CC_MERCAHNT_PASSWORD || '',
    },
  },
  mobileExpressConfig: {
    gatewayUrl: global.secrets.MOBILE_EXPRESS_GATEWAY_URL,
    authorizationKey: global.secrets.MOBILE_EXPRESS_AUTH_KEY,
    merchantCode: global.secrets.MOBILE_EXPRESS_MERCHANT_CODE,
  },
  cardSaveProvider: {
    KW: paymentProviders.TAP,
    SA: paymentProviders.CHECKOUT,
    AE: paymentProviders.CHECKOUT,
    GB: paymentProviders.CHECKOUT,
    TR: paymentProviders.MOBILE_EXPRESS,
    OM: paymentProviders.CHECKOUT,
    EG: paymentProviders.CHECKOUT,
  },
  itemsPerPage: 10,
  countryPaymentServices: {
    KW: [paymentProviders.TAP],
    SA: [paymentProviders.CHECKOUT],
    AE: [paymentProviders.CHECKOUT],
    GB: [paymentProviders.CHECKOUT],
    TR: [paymentProviders.MOBILE_EXPRESS],
    OM: [paymentProviders.CHECKOUT],
    EG: [paymentProviders.CHECKOUT],
  },
  myFatoorah: {
    KW: {
      gatewayUrl: global.secrets.MF_KW_GATEWAY_URL || '',
      apiKey: global.secrets.MF_KW_API_KEY || '',
      requestTimeout: 20000,
      offsetExpiryDateInMinutes: 2,
    },
    SA: {
      gatewayUrl: global.secrets.MF_SA_GATEWAY_URL || '',
      apiKey: global.secrets.MF_SA_API_KEY || '',
      requestTimeout: 20000,
      offsetExpiryDateInMinutes: 2,
    },
    AE: {
      gatewayUrl: global.secrets.MF_AE_GATEWAY_URL || '',
      apiKey: global.secrets.MF_AE_API_KEY || '',
      requestTimeout: 20000,
      offsetExpiryDateInMinutes: 2,
    },
  },
  checkoutCom: {
    isApplePayEnabled: booleanSetting('CKO_IS_APPLE_PAY_ENABLED'),
    isGooglePayEnabled: booleanSetting('CKO_IS_GOOGLE_PAY_ENABLED'),
    GB: {
      publicKey: global.secrets.CKO_GB_PUBLIC_KEY || '',
      secretKey: global.secrets.CKO_GB_SECRET_KEY || '',
    },
    AE: {
      publicKey: global.secrets.CKO_AE_PUBLIC_KEY || '',
      secretKey: global.secrets.CKO_AE_SECRET_KEY || '',
    },
    SA: {
      publicKey: global.secrets.CKO_SA_PUBLIC_KEY || '',
      secretKey: global.secrets.CKO_SA_SECRET_KEY || '',
    },
    OM: {
      publicKey: global.secrets.CKO_OM_PUBLIC_KEY || '',
      secretKey: global.secrets.CKO_OM_SECRET_KEY || '',
    },
    EG: {
      publicKey: global.secrets.CKO_EG_PUBLIC_KEY || '',
      secretKey: global.secrets.CKO_EG_SECRET_KEY || '',
    },
    KW: {
      publicKey: global.secrets.CKO_KW_PUBLIC_KEY || '',
      secretKey: global.secrets.CKO_KW_SECRET_KEY || '',
    },
  },
  tap: {
    isApplePayEnabled: booleanSetting('TAP_IS_APPLE_PAY_ENABLED'),
    isGooglePayEnabled: booleanSetting('TAP_IS_GOOGLE_PAY_ENABLED'),
    gatewayUrl: global.secrets.TAP_GATEWAY_URL || '',
    KW: {
      secretKey: global.secrets.TAP_KW_SECRET_KEY || '',
      publicKey: {
        android: global.secrets.TAP_KW_PUBLIC_KEY_FOR_ANDROID || '',
        ios: global.secrets.TAP_KW_PUBLIC_KEY_FOR_IOS || '',
        default: global.secrets.TAP_KW_PUBLIC_KEY || '',
      },
    },
    SA: {
      secretKey: global.secrets.TAP_SA_SECRET_KEY || '',
      publicKey: {
        android: global.secrets.TAP_SA_PUBLIC_KEY_FOR_ANDROID || '',
        ios: global.secrets.TAP_SA_PUBLIC_KEY_FOR_IOS || '',
        default: global.secrets.TAP_SA_PUBLIC_KEY || '',
      },
    },
    AE: {
      secretKey: global.secrets.TAP_AE_SECRET_KEY || '',
      publicKey: {
        android: global.secrets.TAP_AE_PUBLIC_KEY_FOR_ANDROID || '',
        ios: global.secrets.TAP_AE_PUBLIC_KEY_FOR_IOS || '',
        default: global.secrets.TAP_AE_PUBLIC_KEY || '',
      },
    },
  },
  order: {
    receiptUrl: 'cofedistrict://receipt',
    errorUrl: 'cofedistrict://error',
  },
  saveCardUrls: {
    successUrl: 'cofedistrict://card-save-success',
    errorUrl: 'cofedistrict://card-save-fail',
  },
  generatedGiftCardCustomer: global.secrets.GENERATED_GIFT_CARD_CUSTOMER,
  newrelic: {
    appName: global.secrets.NEWRELIC_APP_NAME || '',
    licenseKey: global.secrets.NEWRELIC_LICENSE_KEY || '',
  },
  authServiceUrl: global.secrets.AUTH_SERVICE_URL || '',
  authServiceTimeout:
    parseInt(global.secrets.AUTH_SERVICE_TIMEOUT, 10) || 10000,
  defaultExpiryPeriod: 24 * 30, // 30 days in hours
  scheduledNotificationService: {
    defaultDelayInSeconds:
      parseInt(
        global.secrets.SCHEDULED_NOTIFICATION_DEFAULT_DELAY_SECONDS,
        10
      ) || 64800,
    url: global.secrets.SCHEDULED_NOTIFICATION_SERVICE_URL || '',
    timeout:
      parseInt(global.secrets.SCHEDULED_NOTIFICATION_SERVICE_TIMEOUT, 10) ||
      10000,
  },
  orderCheckerService: {
    waitInSeconds:
      parseInt(global.secrets.ORDER_CHECKER_DEFAULT_WAIT_SECONDS, 10) || 120,
    url: global.secrets.ORDER_CHECKER_SERVICE_URL || '',
  },
  arrivedNotificationService: {
    url: global.secrets.ARRIVED_NOTIFICATION_SERVICE_URL || '',
  },
  priceSlash: {
    autoFillCompareAtPriceForUndefined: booleanSetting(
      'AUTOFILL_UNDEFINED_COMPARE_AT_PRICE'
    ),
  },
  zendeskService: {
    username: global.secrets.ZENDESK_USERNAME,
    token: global.secrets.ZENDESK_TOKEN,
    remoteUri: global.secrets.ZENDESK_REMOTE_URI,
  },
  slackWebHookUrlPath:
    global.secrets.SLACK_WEBHOOK_URL_PATH ||
    'services/TQY240BDY/B029VBJALRG/VSQJUON6AuJsIUgHzgcXSp5c',
  newBrandsListMaxCount: 350,
  locationsInRadiusTtlInSeconds:
    parseInt(global.secrets.LOCATIONS_IN_RADIUS_TTL_SECONDS, 10) || 600,
  brandLocationOpeningsTtlInSeconds:
    parseInt(global.secrets.BRAND_LOCATION_OPENINGS_TTL_SECONDS, 10) || 120,
  branchesForHomePageTtlInSeconds:
    parseInt(global.secrets.BRANCHES_FOR_HOME_PAGE_TTL_SECONDS, 10) || 30,
  redisTimeParameter: {
    oneHourInSeconds: 60 * 60,
    oneDayInSeconds: 60 * 60 * 24,
    fiveMinutesInSeconds: 60 * 5,
  },
  invoiceCachingTtlInSeconds:
    parseInt(global.secrets.INVOICE_CACHING_TTL_IN_SECONDS, 10) || 60 * 5,
  microservices: {
    branchDistanceMicroserviceURL:
      global.secrets.BRANCH_DISTANCE_MICROSERVICE_URL ||
      env.BRANCH_DISTANCE_MICROSERVICE_URL,
    branchLocationsMicroserviceURL:
      global.secrets.BRANCH_LOCATIONS_MICROSERVICE_URL ||
      env.BRANCH_LOCATIONS_MICROSERVICE_URL,
    customerProfilePictureEndpoint:
      global.secrets.CUSTOMER_PROFILE_PICTURE_ENDPOINT ||
      env.CUSTOMER_PROFILE_PICTURE_ENDPOINT,
  },
  loggerParameter: {
    sync: false,
  },
  eInvoice: {
    TR: {
      isEnabled: global.secrets.E_INVOICE_TR_ENABLED || false,
      endpoint: global.secrets.E_INVOICE_TR_TRIGGER_URL || '',
      tax: {
        food: global.secrets.E_INVOICE_TR_VAT_FOOD || 8,
        drink: global.secrets.E_INVOICE_TR_VAT_DRINK || 8,
        others: global.secrets.E_INVOICE_TR_VAT_OTHERS || 18,
        delivery: global.secrets.E_INVOICE_TR_VAT_DELIVERY || 18,
      },
    },
  },
  customerProfilePicture: {
    amazonProperties: {
      bucketName:
        global.secrets.CUSTOMER_PROFILE_PICTURE_AWS_BUCKET_NAME ||
        'customer-profile-pictures',
      region:
        global.secrets.CUSTOMER_PROFILE_PICTURE_AWS_BUCKET_REGION ||
        'eu-west-1',
      folderPath:
        global.secrets.CUSTOMER_PROFILE_PICTURE_AWS_BUCKET_FOLDER_PATH ||
        'local',
    },
  },
  cofelytics: {
    senderEmail:
      global.secrets.COFELYTICS_SENDER || 'no-reply@cofedistrict.com',
    receiverEmail:
      global.secrets.COFELYTICS_RECEIVER || 'cofelyticsrequest@cofeapp.com',
  },
  eInvoiceLambda:
    global.secrets.STORE_ORDER_INVOICE_URL ||
    (env.NODE_ENV === 'production'
      ? 'https://wcyphkzbdvowh46n56uatuhxnq0bmexy.lambda-url.eu-west-1.on.aws/'
      : 'https://yhb6a5babnny6g5cf4rpbz3taa0meapy.lambda-url.eu-west-1.on.aws/'),
  subscriptionInvoiceLambda:
    global.secrets.SUBSCRIPTION_INVOICE_URL ||
    (env.NODE_ENV === 'production'
      ? 'https://jqszj2pb3hbnjyqwh7dc523dve0ryvdk.lambda-url.eu-west-1.on.aws/'
      : 'https://zak3t7rcrhtbdzofb5hbwh5lq40fzhbx.lambda-url.eu-west-1.on.aws/'),
  invoice: {
    storeOrder: {
      SA: {
        bucket: 'cofeapp-einvoices',
        folderPath: env.NODE_ENV === 'production' ? 'live' : 'test',
        signedUrlExpireSeconds: 60 * 10,
        urlPrefix: 'invoices/ksa/download-store-invoice',
      },
      AE: {
        bucket: 'cofeapp-einvoices',
        folderPath: env.NODE_ENV === 'production' ? 'live' : 'test',
        signedUrlExpireSeconds: 60 * 10,
        urlPrefix: 'invoices/ae/download-store-invoice',
      },
      KW: {
        bucket: 'cofeapp-einvoices',
        folderPath: env.NODE_ENV === 'production' ? 'live' : 'test',
        signedUrlExpireSeconds: 60 * 10,
        urlPrefix: 'invoices/kw/download-store-invoice',
      },
    },
    subscriptionOrder: {
      SA: {
        bucket: 'cofeapp-subscription-einvoices',
        folderPath: env.NODE_ENV === 'production' ? 'live' : 'test',
        signedUrlExpireSeconds: 60 * 10,
        urlPrefix: 'TO_BE_ADDED',
      },
      AE: {
        bucket: 'cofeapp-subscription-einvoices',
        folderPath: env.NODE_ENV === 'production' ? 'live' : 'test',
        signedUrlExpireSeconds: 60 * 10,
        urlPrefix: 'TO_BE_ADDED',
      },
      KW: {
        bucket: 'cofeapp-subscription-einvoices',
        folderPath: env.NODE_ENV === 'production' ? 'live' : 'test',
        signedUrlExpireSeconds: 60 * 10,
        urlPrefix: 'TO_BE_ADDED',
      },
    },
  },
  suggestBrandSlackUrl:
    global.secrets.SUGGEST_BRAND_SLACK_URL || env.SUGGEST_BRAND_SLACK_URL,
  otpBlock: {
    limit: 5,
    slackUrl:
      env.NODE_ENV === 'production'
        ? 'https://hooks.slack.com/services/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'
        : undefined,
  },
  otp: {
    OTPCodeTableName: global.secrets.OTP_CODE_TABLE_NAME || 'dev-AuthOTPCode',
    OTPHitTableName: global.secrets.OTP_HIT_TABLE_NAME || 'dev-OTPHit',
    OTPValidityInSeconds: global.secrets.OTP_VALIDITY_IN_SECONDS
      ? Number(global.secrets.OTP_VALIDITY_IN_SECONDS)
      : 60,
    OTPHitValidityInSeconds: global.secrets.OTP_HIT_VALIDITY_IN_SECONDS
      ? Number(global.secrets.OTP_HIT_VALIDITY_IN_SECONDS)
      : 300,
    isOTPRateLimitActive: booleanSetting('IS_OTP_RATE_LIMIT_ACTIVE'),
    OTPRateLimit: global.secrets.OTP_RATE_LIMIT || 5,
    senderID: global.secrets.OTP_SENDER_ID || 'CofeApp',
    karixKey: global.secrets.OTP_KARIX_KEY,
    karixSMSBaseURL: global.secrets.OTP_KARIX_SMS_BASE_URL,
    karixSMSSenderId: global.secrets.OTP_KARIX_SMS_SENDER_ID || 'CofeApp',
    unifonicAppSid: global.secrets.OTP_UNIFONIC_APP_SID,
    unifonicSMSBaseURL: global.secrets.OTP_UNIFONIC_SMS_BASE_URL,
    unifonicSMSSenderId:
      global.secrets.OTP_UNIFONIC_SMS_SENDER_ID || 'Cofe App',
    cequensSMSBaseURL: global.secrets.OTP_CEQUENS_SMS_BASE_URL,
    cequensSMSSenderId: global.secrets.OTP_CEQUENS_SMS_SENDER_ID || 'Cofe App',
    cequensToken: global.secrets.OTP_CEQUENS_TOKEN,
    victoryLinkSMSBaseURL: global.secrets.OTP_VICTORY_LINK_SMS_BASE_URL,
    victoryLinkSMSSenderId:
      global.secrets.OTP_VICTORY_LINK_SMS_SENDER_ID || 'Cofe App',
    victoryLinkUsername: global.secrets.OTP_VICTORY_LINK_SMS_USERNAME,
    victoryLinkPassword: global.secrets.OTP_VICTORY_LINK_SMS_PASSWORD,
    unifonicWhatsappSMSBaseURL:
      global.secrets.OTP_UNIFONIC_WHATSAPP_SMS_BASE_URL,
    unifonicWhatsappPublicId: global.secrets.OTP_UNIFONIC_WHATSAPP_PUBLIC_ID,
    unifonicWhatsappSecret: global.secrets.OTP_UNIFONIC_WHATSAPP_SECRET,
    unifonicWhatsappTemplateName:
      global.secrets.OTP_UNIFONIC_WHATSAPP_TEMPLATE_NAME ||
      'one_time_password_v1',
    mockEnabledEnvironments: ['development', 'staging'],
    mockOTP: 123456,
    simulateErrorInMock: false,
    mockEnabledPhoneNumbers: ['+905390000000', '+971559000000'],
    mockDisabledPhoneNumbers: [
      '+971585968794',
      '+971559042574',
      '+971585711876',
      '+971585568794',
      '+201140278168',
    ],
  },
  to_talabat: {
    awsAccessKeyId: global.secrets.AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: global.secrets.AWS_SECRET_ACCESS_KEY,
    sqsRegion: global.secrets.SQS_DELIVERY_REGION,
    sqsQueueUrl: global.secrets.SQS_COFE_TO_TAC_QUEUE,
  },
  from_talabat: {
    awsAccessKeyId: global.secrets.AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: global.secrets.AWS_SECRET_ACCESS_KEY,
    sqsRegion: global.secrets.SQS_DELIVERY_REGION,
    sqsQueueUrl: global.secrets.SQS_TAC_TO_COFE_QUEUE,
  },
  from_barq: {
    awsAccessKeyId: global.secrets.AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: global.secrets.AWS_SECRET_ACCESS_KEY,
    sqsRegion: global.secrets.SQS_DELIVERY_REGION,
    sqsQueueUrl: global.secrets.SQS_BARQ_TO_COFE_QUEUE,
  },
  to_barq: {
    awsAccessKeyId: global.secrets.AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: global.secrets.AWS_SECRET_ACCESS_KEY,
    sqsRegion: global.secrets.SQS_DELIVERY_REGION,
    sqsQueueUrl: global.secrets.SQS_COFE_TO_BARQ_QUEUE,
  },
  to_foodics: {
    awsAccessKeyId: global.secrets.AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: global.secrets.AWS_SECRET_ACCESS_KEY,
    sqsRegion: global.secrets.SQS_DELIVERY_REGION,
    sqsQueueUrl: global.secrets.FAC_REPLY_QUEUE_URL,
  },
  foodics_order_queue: {
    awsAccessKeyId: global.secrets.AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: global.secrets.AWS_SECRET_ACCESS_KEY,
    sqsRegion: global.secrets.SQS_DELIVERY_REGION,
    sqsQueueUrl: global.secrets.FOODICS_ORDER_QUEUE,
  },
  foodics: {
    awsAccessKeyId: global.secrets.AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: global.secrets.AWS_SECRET_ACCESS_KEY,
    sqsRegion: global.secrets.SQS_DELIVERY_REGION,
    sqsQueueUrl: global.secrets.FAC_QUEUE_URL,
    authUrl: global.secrets.FAC_AUTH_URL,
    createDataLinks: global.secrets.FAC_DATA_LINK_URL,
    successUrl: global.secrets.VENDOR_PORTAL_URL_SUCCESS,
    failureUrl: global.secrets.VENDOR_PORTAL_URL_FAILURE,
  },
  adjust: {
    urlForInspectDevice:
      global.secrets.ADJUST_URL_FOR_INSPECT_DEVICE ||
      'https://api.adjust.com/device_service/api/v1/inspect_device',
    apiToken: global.secrets.ADJUST_API_TOKEN || 'xfwdAEnfsCCLN1isS9a-',
    appToken: global.secrets.ADJUST_APP_TOKEN || 'lgnj5g2vtdds',
  },
  xmlfeed: {
    s3Bucket: 'cofe-app-xml-feed',
    xmlFolderSegment1: 'src',
    xmlFolderSegment2: 'xmlfeeds',
  },
  maintenance: {
    tasleehUrl: global.secrets.TASLEEH_URL,
    tasleehApiKey: global.secrets.TASLEEH_API_KEY,
  },
  defaultBrandLocationContacts: {
    EG: '+200221600040',
    KW: '+96880073267',
    OM: '+96880073267',
    SA: '+9668008500858',
    AE: '+971045207023',
  },
  orderRatingSlackUrl: {
    adminPortal: {
      baseUrl:
        global.secrets.ORDER_RATING_ADMIN_PORTAL_BASE_URL ||
        env.ORDER_RATING_ADMIN_PORTAL_BASE_URL,
      ordersPage: 'orders',
      customersPage: 'reporting/customers',
    },
    SA: {
      url:
        global.secrets.ORDER_RATING_SA_SLACK_URL ||
        env.ORDER_RATING_SA_SLACK_URL,
    },
    AE: {
      url:
        global.secrets.ORDER_RATING_AE_SLACK_URL ||
        env.ORDER_RATING_AE_SLACK_URL,
    },
    KW: {
      url:
        global.secrets.ORDER_RATING_KW_SLACK_URL ||
        env.ORDER_RATING_KW_SLACK_URL,
    },
    EG: {
      url:
        global.secrets.ORDER_RATING_EG_SLACK_URL ||
        env.ORDER_RATING_EG_SLACK_URL,
    },
  },
  sharedApiKeys: [
    // TODO: it needs to be changed in the future for a sustainable structure
    {
      service: 'alexa',
      key: global.secrets.SHARED_API_KEYS_ALEXA || env.SHARED_API_KEYS_ALEXA,
    },
  ],
  alexaDebugSlackWebhook:
    global.secrets.ALEXA_DEBUG_SLACK_WEBHOOK || env.ALEXA_DEBUG_SLACK_WEBHOOK,
  accountDeletionSlackUrl:
    global.secrets.ACCOUNT_DELETION_SLACK_URL || env.ACCOUNT_DELETION_SLACK_URL,
  smsAlertSlackUrl:
    global.secrets.SMS_ALERT_SLACK_URL || env.SMS_ALERT_SLACK_URL,
  cSubscription: {
    restEndpointsApiKey: global.secrets.C_SUBSCRIPTION_REST_ENDPOINTS_API_KEY,
    sqsRegion: global.secrets.C_SUBSCRIPTION_SQS_REGION,
    sqsQueueUrl: global.secrets.C_SUBSCRIPTION_FINISHING_SQS_URL,
    slackWebHook:
      global.secrets.SUBSCRIPTION_WEBHOOK_URL ||
      (env.NODE_ENV === 'production'
        ? 'services/TQY240BDY/B0440CN6R8F/blj1eCNTEbe0xyQp5HSMG1N3'
        : 'services/TQY240BDY/B044ESH307M/ueP9DQJdmoRS4c7vsfHyO4SL'),
    countryUrls: {
      SA:
        env.NODE_ENV === 'production'
          ? global.secrets.SUBSCRIPTION_SA_SLACK_URL
          : global.secrets.SUBSCRIPTION_WEBHOOK_URL,
      AE:
        env.NODE_ENV === 'production'
          ? global.secrets.SUBSCRIPTION_AE_SLACK_URL
          : global.secrets.SUBSCRIPTION_WEBHOOK_URL,
      KW:
        env.NODE_ENV === 'production'
          ? global.secrets.SUBSCRIPTION_KW_SLACK_URL
          : global.secrets.SUBSCRIPTION_WEBHOOK_URL,
    },
  },
  branchAvailability: {
    restEndpointsApiKey:
      global.secrets.BRAND_LOCATION_OPENED_NOTIFICATION_API_KEY,
    redisTtlSeconds:
      global.secrets.AUTO_BRAND_LOCATION_STATUS_CACHE_TTL_SECONDS || 65,
    closingSoonInMinutes: global.secrets.STORE_CLOSING_SOON_IN_MINUTES || 10,
  },
  image: {
    sizeInBytes: 1024 * 1024 * 15,
    allowedExtensions: [
      'image/jpg',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'video/mp4',
    ],
    s3: {
      accessKeyId: global.secrets.AWS_ACCESS_KEY_ID_FOR_PORTAL_UPLOADER,
      secretAccessKey: global.secrets.AWS_SECRET_ACCESS_KEY_FOR_PORTAL_UPLOADER,
      bucket: 'content.cofeadmin.com',
      folderPath:
        'media/' +
        (env.NODE_ENV === 'production'
          ? 'production'
          : env.NODE_ENV === 'staging'
            ? 'staging'
            : 'development'),
    },
  },
  analytics: {
    sqsQueueUrl:
      global.secrets.ANALYTICS_SQS_QUEUE_URL || env.ANALYTICS_SQS_QUEUE_URL,
    sqsRegion: global.secrets.ANALYTICS_SQS_REGION || env.ANALYTICS_SQS_REGION,
  },
  checkInconsistentData: {
    sqsQueueUrl:
      global.secrets.CHECK_INCONSISTENT_DATA_SQS_QUEUE_URL ||
      env.CHECK_INCONSISTENT_DATA_SQS_QUEUE_URL,
    sqsRegion:
      global.secrets.CHECK_INCONSISTENT_DATA_SQS_REGION ||
      env.CHECK_INCONSISTENT_DATA_SQS_REGION,
  },
  serviceExchangeKey:
    global.secrets.SERVICE_EXCHANGE_KEY || 'jJ8mkGamVGy7xMZXug1ydKJpieLpBJpZ',
  ecommerce: {
    paymentWebhook: global.secrets.ECOM_PAYMENT_WEBHOOK,
    paymentCallback: global.secrets.ECOM_PAYMENT_CALLBACK,
    paymentMfCallback: global.secrets.ECOM_PAYMENT_MF_CALLBACK,
    paymentTapCallback:
      global.secrets.ECOM_PAYMENT_TAP_CALLBACK ||
      'https://ecom-dev-orders.cofeapp.com/v1/payment-tap-callback',
  },
  ecommercePortalUrl:
    global.secrets.ECOM_PORTAL_URL ||
    'https://ecom-dev-backoffice.cofeapp.com/',
  CDN: {
    bucketMapping: {
      'content.cofeadmin.com': 'https://d2v97fdht6b7g6.cloudfront.net',
    },
  },
  firebaseLoginBaseURL:
    'https://www.googleapis.com/identitytoolkit/v3/relyingparty',
  firebaseSignInKey: 'AIzaSyCeOQdYFxHCZzaQTvVye3jYqtqYjNbwIww',
  firebaseVerifyPassword: '/verifyPassword?key=',
  firebaseGetAccountInformation: '/getAccountInfo?key=',
  abandonedCart: {
    reminderSentAfterInMinutes: [15, 30, 45],
    cartTimeoutInMinutes: 60,
  },
  uploadFile: {
    sizeInBytes: 1024 * 1024 * 15,
    allowedExtensions: ['text/csv'],
    s3: {
      accessKeyId: global.secrets.AWS_ACCESS_KEY_ID_FOR_PORTAL_UPLOADER,
      secretAccessKey: global.secrets.AWS_SECRET_ACCESS_KEY_FOR_PORTAL_UPLOADER,
      bucket: 'content.cofeadmin.com',
      folderPath:
        'uploaded-files/' +
        (env.NODE_ENV === 'production'
          ? 'production'
          : env.NODE_ENV === 'staging'
            ? 'staging'
            : 'development'),
    },
  },
  SNSTopics: {
    ANALYTICS_EVENTS: global.secrets.SNS_TOPIC_ANALYTICS_EVENTS,
  },
  bulkOrderSetStatusUpdateLimit:
    global.secrets.BULK_ORDER_STATUS_UPDATE_LIMIT || 10,
  homePage: {
    horizontalCardListItemPerPageItemNumber:
      global.secrets.HORIZONTAL_CARD_LIST_ITEM_PER_PAGE_ITEM_NUMBER || 5,
  },
  deliverectConfig: {
    clientId: 'rjF8brjiH4XQhTD0',
    clientSecret: 'qyoYTF9GAbfJkfJBkFXiMlyW9g3oxmk1',
    audience: 'https://api.staging.deliverect.com',
  },
  otterConfig: {
    clientId: global.secrets.TRYOTTER_CLIENT_ID,
    clientSecret: global.secrets.TRYOTTER_CLIENT_SECRET,
    grantType: global.secrets.TRYOTTER_GRANT_TYPE,
  },
};
