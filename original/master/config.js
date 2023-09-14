
const { env } = require('./master-config');

const loyaltyTierConfig = require('./loyalty-tier-config');
const { notificationProviders } = require('./src/notifications/enums');
const { paymentProviders } = require('./src/payment-service/enums');

const isTest = env.NODE_ENV.indexOf('test') > -1;

module.exports = global.secrets = {
  apm: {
    serviceName: env.APM_SERVICE_NAME || 'dev-api-cofe-cloud',
    serverUrl: env.APM_SERVER_URL || 'https://apm.cofe.cloud:443',
    enabled: env.APM_SERVICE_ENABLED || false,
  },
  tenantDomainName: env.CHILD_DOMAIN_NAME,
  timezone: env.TIMEZONE || 'Asia/Kuwait',
  authyApiKey: env.AUTHY_API_KEY,
  basePath: env.BASE_PATH || '',
  env: env.NODE_ENV,
  isProd: env.NODE_ENV === 'production',
  isDev:
    env.NODE_ENV === 'development' ||
    env.NODE_ENV === 'localtest' ||
    env.NODE_ENV === 'staging',
  isTest,
  defaultUserId: env.DEFAULT_USER_ID,
  defaultUserName: env.DEFAULT_USER_NAME || 'Gandalf The White',
  defaultUserEmail: env.DEFAULT_USER_EMAIL || 'gandalf@isengard.me',
  defaultUserPasswordHash: '$2b$15$EsOnKIiibgO.RHb/ykhtCu1x1pPiBz8Bbpg4gONRPh1Afu4rIaBZK',
  mocksEnabled: env.GRAPHQL_ENABLE_MOCKING || false,
  skipSeedTestOrders: !isTest && env.SKIP_SEED_TEST_ORDERS,
  // Used to simulate db latency for performance testing
  simulateSelectLatency: env.SIMULATE_SELECT_LATENCY,
  countDbQueries: env.COUNT_DB_QUERIES || false,
  validateCouponRedemptionLimit: isTest || env.VALIDATE_COUPON_REDEMPTION_LIMIT,
  apiAuthToken: env.API_AUTH_TOKEN || '05c6a6a0-6870-4072-af1a-df1d4fd58178',
  database: {
    connection: env.DATABASE_URL,
    readOnlyConnection: env.RO_DATABASE_URL || null,
    localTestConnection: env.LOCALTEST_DATABASE_URL || 'postgres://localhost:5432/cofe-district-test',
  },
  enableSqlCache: env.ENABLE_SQL_CACHE || !isTest,
  enableFoodicsIntegration: env.ENABLE_FOODICS_INTEGRATION || false,
  enableCheckSubscriptionsFinishStatusIntegration: env.ENABLE_CHECK_SUBSCRIPTIONS_FINISH_STATUS_INTEGRATION || false,
  enableFinishCustomerSubscriptionIntegration: env.ENABLE_FINISH_CUSTOMER_SUBSCRIPTION_INTEGRATION || false,
  enableMposOrderIntegration: env.ENABLE_MPOS_ORDER_INTEGRATION || false,
  enableSendAnalyticsEvent: env.ENABLE_SEND_ANALYTICS_EVENT || false,
  enableCheckInconsistentData: env.ENABLE_CHECK_INCONSISTENT_DATA || false,
  enableTalabatIntegration: env.ENABLE_TALABAT_INTEGRATION || false,
  enableBarqIntegration: env.ENABLE_BARQ_INTEGRATION || false,
  enableNotificationIntegration: env.ENABLE_NOTIFICATION_INTEGRATION || false,
  enableBrazeEvents: env.ENABLE_BRAZE_EVENTS || false,
  enableSnsEventPublisher: env.ENABLE_SNS_EVENT_PUBLISHER || false,
  awsRemoteConfig: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    region: env.AWS_GLOBAL_REGION || 'eu-west-1'
  },
  redis: {
    connection: env.REDIS_CONNECTION_URL,
    testConnection: env.REDIS_TEST_CONNECTION_URL || '',
  },
  crons: {
    enableCronJobs: env.ENABLE_CRON_JOBS || false,
    brandLocationStatusCacher: {
      interval: env.BRAND_LOCATION_STATUS_CACHER_INTERVAL || '*/1 * * * *',
      enable: env.ENABLE_BRAND_LOCATION_STATUS_CACHER || false,
      job: env.BRAND_LOCATION_STATUS_CACHER_JOB_NAME || 'AutoBrandLocationStatusCacher',
      redisTtl: env.AUTO_BRAND_LOCATION_STATUS_CACHE_TTL_SECONDS || 65,
    },
    autoStockRefresher: {
      interval: env.AUTO_STOCK_REFRESHER_INTERVAL || '*/1 * * * *',
      enable: env.ENABLE_AUTO_STOCK_REFRESHER || false,
      job: env.AUTO_STOCK_REFRESHER_JOB_NAME || 'AutoStockRefresher',
    },
    branchAvailabilityCacher: {
      enable: env.ENABLE_BRANCH_AVAILABILITY_CACHER || false,
      job: env.BRANCH_AVAILABILITY_CACHER_JOB_NAME || 'BranchAvailabilityCacher',
      interval: env.BRANCH_AVAILABILITY_CACHER_INTERVAL || '*/1 * * * *',
      redisTtl: env.AUTO_BRAND_LOCATION_STATUS_CACHE_TTL_SECONDS || 65,
      closingSoonInMinutes: env.STORE_CLOSING_SOON_IN_MINUTES || 10,
    },
    branchOpenedNotification: {
      enable: env.ENABLE_BRANCH_OPENED_NOTIFICATION || false,
      job: env.BRANCH_OPENED_NOTIFICATION_JOB_NAME || 'BranchOpenedNotification',
      interval: env.BRANCH_OPENED_NOTIFICATION_INTERVAL || '*/1 * * * *',
      redisTtl: env.AUTO_BRAND_LOCATION_STATUS_CACHE_TTL_SECONDS || 65,
      apiKey: env.BRAND_LOCATION_OPENED_NOTIFICATION_API_KEY || 10,
      baseUrl: env.BASE_PATH,
    },
    customerAccountDeleter: {
      enable: env.ENABLE_CUSTOMER_ACCOUNT_DELETER || false,
      job: env.CUSTOMER_ACCOUNT_DELETER_JOB_NAME || 'CustomerAccountDeleter',
      interval: env.CUSTOMER_ACCOUNT_DELETER_INTERVAL || '*/1 * * * *',
      apiKey: env.BRAZE_API_KEY || '',
      brazeEndpoint: env.BRAZE_REST_URL || ''
    },
    checkReminderStatuses: {
      enable: env.ENABLE_CHECK_REMINDER_STATUSES || false,
      job: env.CHECK_REMINDER_STATUSES_JOB_NAME || 'CheckReminderStatuses',
      interval: env.CHECK_REMINDER_STATUSES_INTERVAL || '*/1 * * * *',
      orderType: env.ORDER_TYPE,
      referenceOrderId: env.REFERENCE_ORDER_ID,
    },
    checkSubscriptionsAutoRenewalReminderStatus: {
      enable: env.ENABLE_CHECK_SUBSCRIPTIONS_AUTO_RENEWAL_REMINDER_STATUS || false,
      job: env.CHECK_SUBSCRIPTIONS_AUTO_RENEWAL_REMINDER_STATUS_JOB_NAME || 'CheckSubscriptionsAutoRenewalReminderStatus',
      interval: env.CHECK_SUBSCRIPTIONS_AUTO_RENEWAL_REMINDER_STATUS_INTERVAL || '*/1 * * * *',
      AutoRenewelReminderBeforeFinishInMinutes: env.AUTO_RENEWEL_REMINDER_BEFORE_FINISH_IN_MINUTES,
    },
    checkSubscriptionsExpired15DaysLaterReminderStatus: {
      enable: env.ENABLE_CHECK_SUBSCRIPTIONS_EXPIRED_15_DAYS_LATER_REMINDER_STATUS || false,
      job: env.CHECK_SUBSCRIPTIONS_EXPIRED_15_DAYS_LATER_REMINDER_STATUS_JOB_NAME || 'CheckSubscriptionsExpired15DaysLaterReminderStatus',
      interval: env.CHECK_SUBSCRIPTIONS_EXPIRED_15_DAYS_LATER_REMINDER_STATUS_INTERVAL || '*/1 * * * *',
    },
    checkSubscriptionsExpired3DaysLaterReminderStatus: {
      enable: env.ENABLE_CHECK_SUBSCRIPTIONS_EXPIRED_3_DAYS_LATER_REMINDER_STATUS || false,
      job: env.CHECK_SUBSCRIPTIONS_EXPIRED_3_DAYS_LATER_REMINDER_STATUS_JOB_NAME || 'CheckSubscriptionsExpired3DaysLaterReminderStatus',
      interval: env.CHECK_SUBSCRIPTIONS_EXPIRED_3_DAYS_LATER_REMINDER_STATUS_INTERVAL || '*/1 * * * *',
    },
    checkSubscriptionsExpired7DaysLaterReminderStatus: {
      enable: env.ENABLE_CHECK_SUBSCRIPTIONS_EXPIRED_7_DAYS_LATER_REMINDER_STATUS || false,
      job: env.CHECK_SUBSCRIPTIONS_EXPIRED_7_DAYS_LATER_REMINDER_STATUS_JOB_NAME || 'CheckSubscriptionsExpired7DaysLaterReminderStatus',
      interval: env.CHECK_SUBSCRIPTIONS_EXPIRED_7_DAYS_LATER_REMINDER_STATUS_INTERVAL || '*/1 * * * *',
    },
    checkSubscriptionsExpired30DaysLaterReminderStatus: {
      enable: env.ENABLE_CHECK_SUBSCRIPTIONS_EXPIRED_30_DAYS_LATER_REMINDER_STATUS || false,
      job: env.CHECK_SUBSCRIPTIONS_EXPIRED_30_DAYS_LATER_REMINDER_STATUS_JOB_NAME || 'CheckSubscriptionsExpired30DaysLaterReminderStatus',
      interval: env.CHECK_SUBSCRIPTIONS_EXPIRED_30_DAYS_LATER_REMINDER_STATUS_INTERVAL || '*/1 * * * *',
    },
    checkSubscriptionsExpiredTodayReminderStatus: {
      enable: env.ENABLE_CHECK_SUBSCRIPTIONS_EXPIRED_TODAY_REMINDER_STATUS || false,
      job: env.CHECK_SUBSCRIPTIONS_EXPIRED_TODAY_REMINDER_STATUS_JOB_NAME || 'CheckSubscriptionsExpiredTodayReminderStatus',
      interval: env.CHECK_SUBSCRIPTIONS_EXPIRED_TODAY_REMINDER_STATUS_INTERVAL || '*/1 * * * *',
    },
    checkSubscriptionsExpiryDateNearReminderStatus: {
      enable: env.ENABLE_CHECK_SUBSCRIPTIONS_EXPIRY_DATE_NEAR_REMINDER_STATUS || false,
      job: env.CHECK_SUBSCRIPTIONS_EXPIRY_DATE_NEAR_REMINDER_STATUS_JOB_NAME || 'CheckSubscriptionsExpiryDateNearReminderStatus',
      interval: env.CHECK_SUBSCRIPTIONS_EXPIRY_DATE_NEAR_REMINDER_STATUS_INTERVAL || '*/1 * * * *',
      expiryDateNearReminderBeforeFinishInMinutes: env.EXPIRY_DATE_NEAR_REMINDER_BEFORE_FINISH_IN_MINUTES,
    }
  },
  urlShortenerService: {
    shortIdLength: env.URL_SHORTENER_SERVICE_ID_LENGTH || 14,
    shortUrlBasePath: env.URL_SHORTENER_SERVICE_BASE_PATH || env.BASE_PATH,
    shortUrlTtlMinutes: env.URL_SHORTENER_SERVICE_URL_TTL_MINUTES || 60,
  },
  auth: {
    domain: env.AUTH_DOMAIN || '',
    clientId: env.AUTH_CLIENT_ID || '',
    clientSecret: env.AUTH_CLIENT_SECRET || '',
    extensionUrl: env.AUTH_EXTENSION_URL || '',
    defaultRoleId: env.AUTH_DEFAULT_ROLE_ID || '',
  },
  expressDelivery: {
    riderUrl: env.EXPRESS_DELIVERY_RIDER_URL || 'https://tracking.cofeapp.com/edt/page.html',
    jwt: {
      accessTokenExpire: env.EXPRESS_DELIVERY_JWT_ACCESS_TOKEN_EXPIRE || 3600,
      secret: env.EXPRESS_DELIVERY_JWT_SECRET || '',
    },
    redis: {
      ttlSeconds: env.EXPRESS_DELIVERY_REDIS_TTL || 7200,
      accessTimeAfterOrderDelivered: env.EXPRESS_DELIVERY_ACCESS_TIME_DELIVERED || 900,
    },
    ETA: {
      outForDeliveryCountdown: env.EXPRESS_DELIVERY_PICKUP_ETA || 10,
      delayedDeliveryCountdown: env.EXPRESS_DELIVERY_DELAYED_ETA || 5,
    }
  },
  jwt: {
    accessTokenExpire: env.JWT_ACCESS_TOKEN_EXPIRE || 3600,
    refreshTokenExpire: env.JWT_REFRESH_TOKEN_EXPIRE || 86400,
    issuer: env.JWT_ISSUER || '',
    secret: env.JWT_SECRET || '',
    secretPub: env.JWT_SECRET_PUB || '',
  },
  firebaseConfig: {
    type: env.FIREBASE_TYPE || '',
    projectId: env.FIREBASE_PROJECT_ID || '',
    messagingScope: "https://www.googleapis.com/auth/firebase.messaging",
    baseUrl: "https://fcm.googleapis.com",
    notificationsEndpoint: `/v1/projects/${env.FIREBASE_PROJECT_ID}/messages:send`,
    privateKeyId: env.FIREBASE_PRIVATE_KEY_ID || '',
    privateKey: env.FIREBASE_PRIVATE_KEY || '',
    clientEmail: env.FIREBASE_CLIENT_EMAIL || '',
    clientId: env.FIREBASE_CLIENT_ID || '',
    authUri: env.FIREBASE_AUTH_URI || '',
    tokenUri: env.FIREBASE_TOKEN_URI || '',
    authProviderX509CertUrl: env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL || '',
    clientX509CertUrl: env.FIREBASE_CLIENT_X509_CERT_URL || '',
  },
  firebaseScrypt: {
    memCost: parseInt(env.SCRYPT_MEMCOST) || 14,
    rounds: parseInt(env.SCRYPT_ROUNDS) || 8,
    saltSeparator: env.SCRYPT_SALT_SEP,
    signerKey: env.SCRYPT_SIGNER,
  },
  revelConfig: {
    url: env.REVEL_URL || '',
    key: env.REVEL_KEY || '',
    secret: env.REVEL_SECRET || '',
  },
  dynamicLinkConfig: {
    key: env.DYNAMIC_LINK_KEY || '',
    uriPrefix: env.DYNAMIC_LINK_URI_PREFIX || '',
    link: env.DYNAMIC_LINK_LINK || '',
    host: env.DYNAMIC_LINK_HOST || '',
    androidPackageName: env.DYNAMIC_LINK_ANDROID_PACKAGE_NAME || '',
    iosBundleId: env.DYNAMIC_LINK_IOS_BUNDLE_ID || '',
    appStoreId: env.DYNAMIC_LINK_IOS_APP_STORE_ID || '',
    uriPrefixForShortener: env.DYNAMIC_LINK_URI_PREFIX_FOR_SHORTENER || '',
    simulateDynamicLink: env.SIMULATE_DYNAMIC_LINK || false,
  },
  oneSignalConfig: {
    userAuthKey: env.ONESIGNAL_USER_AUTH_KEY || '',
    basicKey: env.ONESIGNAL_BASIC_KEY || '',
    appId: env.ONESIGNAL_APP_ID || '',
    baseUrl: env.ONESIGNAL_BASE_URL || '',
  },
  knet: {
    enableLogging: !isTest && env.KNET_ENABLE_LOGGING,
    gatewayUrl: env.KNET_GATEWAY_URL,
    receiptUrl: env.KNET_RECEIPT_URL,
    password: env.KNET_PASSWORD,
    requestTimeout: env.KNET_REQUEST_TIMEOUT || 5000,
    request: {
      id: env.KNET_ID,
      currencycode: 414,
      langId: env.KNET_LANG_ID,
      responseURL: env.KNET_RESPONSE_URL,
      errorURL: env.KNET_ERROR_URL,
    },
  },
  brazeConfig: {
    brazeServiceURL: env.BRAZE_SERVICE_URL,
    brazeApiKey: env.BRAZE_API_KEY,
  },
  customerAnalyticsConfig: {
    queueName: env.CUSTOMER_ANALYTICS_SERVICE_QUEUE_NAME,
  },
  delivery: {
    enable: env.ENABLE_DELIVERY,
    awsAccessKeyId: env.AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    sqsRegion: env.SQS_DELIVERY_REGION,
    sqsQueueUrl: env.SQS_DELIVERY_QUEUE_URL,
    deliveryServiceUrl: env.DELIVERY_SERVICE_URL,
    deliveryServiceToken: env.DELIVERY_SERVICE_TOKEN,
  },
  notifications: {
    // We want enableNotifications to be true for tests since mocking happens in pushlib to avoid sending them,
    // and because several integration tests would break otherwise.
    enableNotifications: isTest || env.ENABLE_NOTIFICATIONS,
    sqsRegion: env.SQS_REGION,
    sqsQueueUrl: env.SQS_QUEUE_URL,
    awsAccessKeyId: env.AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    emailAddresses: {
      financeTeamEmails: env.FINANCE_TEAM_EMAILS || [
        "s.arif@cofeapp.com",
        "mikita@cofeapp.com"
      ],
      supportEmails: env.SUPPORT_EMAILS || {
        "KW": "ayesha.tariq@werplay.com",
        "SA": "hadi@werplay.com",
        "AE": "ayesha.tariq@werplay.com",
        "TR": "ayesha.tariq@werplay.com",
        "GB": "hadi@werplay.com",
        "EG": "ayesha.tariq@werplay.com",
        "OM": "hadi@werplay.com",
        "DEFAULT": "ayesha.tariq@werplay.com"
      },
      doNotReply: isTest
        ? 'do_not_reply@cofedistrict.com'
        : env.DO_NOT_REPLY_EMAIL,
      receipts: isTest
        ? 'receipts@cofedistrict.com'
        : env.SENDER_EMAIL_FOR_RECEIPTS,
      catering: isTest
        ? 'catering@cofedistrict.com'
        : env.CATERING_CONTACT_EMAIL,
    },
    provider: notificationProviders.FIREBASE_CLOUD_MESSAGING,
  },
  mpos: {
    sqsRegion: env.SQS_MPOS_ORDER_STATUS_UPDATER_QUEUE_REGION,
    sqsQueueUrl: env.SQS_MPOS_ORDER_STATUS_UPDATER_QUEUE_URL,
    slackWebHook: env.MPOS_WEBHOOK_URL || 'services/TQY240BDY/B02J424C0MV/o6S11adzscdZu9M05Lukavyx'
  },
  s3: {
    s3AccessKeyId: env.AWS_ACCESS_KEY_ID,
    s3SecretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
  slackHostURL: env.SLACK_HOST_URL || 'https://hooks.slack.com/',
  tabbyApiKey: env.TABBY_API_KEY_PUBLIC || '',
  googleMapsApiKey: env.GOOGLE_MAPS_API_KEY || '',
  googleMapsReverseGeocodeApiKey:
    env.GOOGLE_MAPS_REVERSE_GEOCODE_API_KEY || '',
  cloudinary: {
    apiKey: env.CLOUDINARY_API_KEY || '',
    apiSecret: env.CLOUDINARY_API_SECRET || '',
  },
  iOSAuth0Config: {
    apiHostname: env.IOS_AUTH0_API_HOSTNAME || '',
    apiIdentifier: env.IOS_AUTH0_API_IDENTIFIER || '', // identifier that maps to the 'API' configured in the console
    clientId: env.IOS_AUTH0_CLIENT_ID || '', // configuration for the Auth0 client mapped to the API
    realm: env.IOS_AUTH0_REALM || '', // database name that is managing the credentials we are using
  },
  apolloEngineKey: !isTest && env.APOLLO_ENGINE_KEY,
  isTracingEnabled: env.IS_GRAPHQL_TRACING_ENABLED || false,
  isCacheControlEnabled: env.IS_GRAPHQL_CACHE_CONTROL_ENABLED || false,
  loyaltyTierConfig,
  loyaltyTopUpSku: 'TOPUP',
  defaultMaxLimit: env.DEFAULT_MAX_LIMIT || 100,
  flickConfig: {
    enableLogging: !isTest && env.FLICK_ENABLE_LOGGING,
    flickBaseURL:
      env.FLICK_BASE_URL || 'http://sandbox.api.flickapp.me/v1',
    orderEndpoint: '/order.json',
    authEndpoint: '/partner.json',
    cityEndpoint: '/city.json',
    storeEndpoint: '/store.json',
    devToken: env.FLICK_DEV_TOKEN || '',
    username: env.FLICK_USERNAME || '',
    password: env.FLICK_PASSWORD || '',
    cityId: env.FLICK_CITY_ID || 1,
    courierName: 'Flick',
  },
  ccPayment: {
    gatewayUrl: env.CC_GATEWAY_URL || '',
    merchant: {
      id: env.CC_MERCHANT_ID || '',
      name: env.CC_MERCHANT_NAME || '',
      address: env.CC_MERCHANT_ADDRESS || '',
      username: env.CC_MERCAHNT_USERNAME || '',
      password: env.CC_MERCAHNT_PASSWORD || '',
    },
  },
  mobileExpressConfig: {
    gatewayUrl: env.MOBILE_EXPRESS_GATEWAY_URL,
    authorizationKey: env.MOBILE_EXPRESS_AUTH_KEY,
    merchantCode: env.MOBILE_EXPRESS_MERCHANT_CODE,
  },
  cardSaveProvider: {
    KW: paymentProviders.CHECKOUT,
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
      gatewayUrl: env.MF_KW_GATEWAY_URL || '',
      apiKey: env.MF_KW_API_KEY || '',
      requestTimeout: 20000,
    },
    SA: {
      gatewayUrl: env.MF_SA_GATEWAY_URL || '',
      apiKey: env.MF_SA_API_KEY || '',
      requestTimeout: 20000,
    },
    AE: {
      gatewayUrl: env.MF_AE_GATEWAY_URL || '',
      apiKey: env.MF_AE_API_KEY || '',
      requestTimeout: 20000,
    },
  },
  checkoutCom: {
    isApplePayEnabled: env.CKO_IS_APPLE_PAY_ENABLED,
    isGooglePayEnabled: env.CKO_IS_GOOGLE_PAY_ENABLED,
    GB: {
      publicKey: env.CKO_GB_PUBLIC_KEY || '',
      secretKey: env.CKO_GB_SECRET_KEY || '',
    },
    AE: {
      publicKey: env.CKO_AE_PUBLIC_KEY || '',
      secretKey: env.CKO_AE_SECRET_KEY || '',
    },
    SA: {
      publicKey: env.CKO_SA_PUBLIC_KEY || '',
      secretKey: env.CKO_SA_SECRET_KEY || '',
    },
    OM: {
      publicKey: env.CKO_OM_PUBLIC_KEY || '',
      secretKey: env.CKO_OM_SECRET_KEY || '',
    },
    EG: {
      publicKey: env.CKO_EG_PUBLIC_KEY || '',
      secretKey: env.CKO_EG_SECRET_KEY || '',
    },
    KW: {
      publicKey: env.CKO_KW_PUBLIC_KEY || '',
      secretKey: env.CKO_KW_SECRET_KEY || '',
    },
  },
  tap: {
    isApplePayEnabled: env.TAP_IS_APPLE_PAY_ENABLED || false,
    gatewayUrl: env.TAP_GATEWAY_URL || '',
    KW: {
      secretKey: env.TAP_KW_SECRET_KEY || '',
      publicKey: env.TAP_KW_PUBLIC_KEY || '',
    },
    SA: {
      secretKey: env.TAP_SA_SECRET_KEY || '',
      publicKey: env.TAP_SA_PUBLIC_KEY || '',
    },
    AE: {
      secretKey: env.TAP_AE_SECRET_KEY || '',
      publicKey: env.TAP_AE_PUBLIC_KEY || '',
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
  generatedGiftCardCustomer: env.GENERATED_GIFT_CARD_CUSTOMER,
  newrelic: {
    appName: env.NEWRELIC_APP_NAME || '',
    licenseKey: env.NEWRELIC_LICENSE_KEY || '',
  },
  authServiceUrl: env.AUTH_SERVICE_URL || '',
  authServiceTimeout:
    parseInt(env.AUTH_SERVICE_TIMEOUT, 10) || 10000,
  defaultExpiryPeriod: 24 * 30, // 30 days in hours
  scheduledNotificationService: {
    defaultDelayInSeconds:
      parseInt(
        env.SCHEDULED_NOTIFICATION_DEFAULT_DELAY_SECONDS,
        10
      ) || 64800,
    url: env.SCHEDULED_NOTIFICATION_SERVICE_URL || '',
    timeout: parseInt(env.SCHEDULED_NOTIFICATION_SERVICE_TIMEOUT, 10) || 10000,
  },
  orderCheckerService: {
    waitInSeconds: parseInt(
      env.ORDER_CHECKER_DEFAULT_WAIT_SECONDS,
      10
    ) || 120,
    url: env.ORDER_CHECKER_SERVICE_URL || '',
  },
  arrivedNotificationService: {
    url: env.ARRIVED_NOTIFICATION_SERVICE_URL || ''
  },
  priceSlash: {
    autoFillCompareAtPriceForUndefined: env.AUTOFILL_UNDEFINED_COMPARE_AT_PRICE || false,
  },
  zendeskService: {
    username: env.ZENDESK_USERNAME,
    token: env.ZENDESK_TOKEN,
    remoteUri: env.ZENDESK_REMOTE_URI,
    subject: env.ZENDESK_SUBJECT,
    comment: env.ZENDESK_COMMENT
  },
  slackWebHookUrlPath: env.SLACK_WEBHOOK_URL_PATH || "",
  newBrandsListMaxCount: 350,
  locationsInRadiusTtlInSeconds:
    parseInt(env.LOCATIONS_IN_RADIUS_TTL_SECONDS, 10) || 600,
  brandLocationOpeningsTtlInSeconds:
    parseInt(env.BRAND_LOCATION_OPENINGS_TTL_SECONDS, 10) || 120,
  branchesForHomePageTtlInSeconds:
    parseInt(env.BRANCHES_FOR_HOME_PAGE_TTL_SECONDS, 10) || 30,
  redisTimeParameter: {
    oneHourInSeconds: 60 * 60,
    oneDayInSeconds: 60 * 60 * 24,
  },
  invoiceCachingTtlInSeconds:
    parseInt(env.INVOICE_CACHING_TTL_IN_SECONDS, 10) || 60 * 5,
  microservices: {
    branchLocationsMicroserviceURL:
      env.BRANCH_LOCATIONS_MICROSERVICE_URL,
    customerProfilePictureEndpoint:
      env.CUSTOMER_PROFILE_PICTURE_ENDPOINT,
  },
  loggerParameter: {
    sync: false,
  },
  customerProfilePicture: {
    amazonProperties: {
      bucketName: env.CUSTOMER_PROFILE_PICTURE_AWS_BUCKET_NAME || 'customer-profile-pictures',
      region: env.CUSTOMER_PROFILE_PICTURE_AWS_BUCKET_REGION || 'eu-west-1',
      folderPath: env.CUSTOMER_PROFILE_PICTURE_AWS_BUCKET_FOLDER_PATH || 'local'
    }
  },
  cofelytics: {
    senderEmail: env.COFELYTICS_SENDER || 'no-reply@cofedistrict.com',
    receiverEmail: env.COFELYTICS_RECEIVER || 'cofelyticsrequest@cofeapp.com',
  },
  eInvoiceLambda: env.STORE_ORDER_INVOICE_URL
    || (env.NODE_ENV === 'production'
      ? 'https://wcyphkzbdvowh46n56uatuhxnq0bmexy.lambda-url.eu-west-1.on.aws/'
      : 'https://yhb6a5babnny6g5cf4rpbz3taa0meapy.lambda-url.eu-west-1.on.aws/'),
  subscriptionInvoiceLambda: env.SUBSCRIPTION_INVOICE_URL
    || (env.NODE_ENV === 'production'
      ? 'https://jqszj2pb3hbnjyqwh7dc523dve0ryvdk.lambda-url.eu-west-1.on.aws/'
      : 'https://zak3t7rcrhtbdzofb5hbwh5lq40fzhbx.lambda-url.eu-west-1.on.aws/'),
  invoice: {
    storeOrder: {
      SA: {
        bucket: 'cofeapp-einvoices',
        folderPath: `${env.NODE_ENV}`,
        signedUrlExpireSeconds: 60 * 10,
        urlPrefix: 'invoices/ksa/download-store-invoice',
      },
      AE: {
        bucket: 'cofeapp-einvoices',
        folderPath: `${env.NODE_ENV}`,
        signedUrlExpireSeconds: 60 * 10,
        urlPrefix: 'invoices/ae/download-store-invoice',
      },
      KW: {
        bucket: 'cofeapp-einvoices',
        folderPath: `${env.NODE_ENV}`,
        signedUrlExpireSeconds: 60 * 10,
        urlPrefix: 'invoices/kw/download-store-invoice',
      },
    },
    subscriptionOrder: {
      SA: {
        bucket: 'cofeapp-subscription-einvoices',
        folderPath: `${env.NODE_ENV}`,
        signedUrlExpireSeconds: 60 * 10,
        urlPrefix: 'TO_BE_ADDED',
      },
      AE: {
        bucket: 'cofeapp-subscription-einvoices',
        folderPath: `${env.NODE_ENV}`,
        signedUrlExpireSeconds: 60 * 10,
        urlPrefix: 'TO_BE_ADDED',
      },
      KW: {
        bucket: 'cofeapp-subscription-einvoices',
        folderPath: `${env.NODE_ENV}`,
        signedUrlExpireSeconds: 60 * 10,
        urlPrefix: 'TO_BE_ADDED',
      },
    },
  },
  suggestBrandSlackUrl: env.SUGGEST_BRAND_SLACK_URL,
  otpBlock: {
    limit: 5,
    slackUrl: env.NODE_ENV === 'production' ? 'https://hooks.slack.com/services/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' : undefined,
  },
  otp: {
    otpRedisConnectionUrl: env.OTP_REDIS_CONNECTION_URL || env.REDIS_CONNECTION_URL,
    OTPCodeTableName: env.OTP_CODE_TABLE_NAME || 'dev-AuthOTPCode',
    OTPHitTableName: env.OTP_HIT_TABLE_NAME || 'dev-OTPHit',
    OTPValidityInSeconds: env.OTP_VALIDITY_IN_SECONDS
      ? Number(env.OTP_VALIDITY_IN_SECONDS)
      : 60,
    OTPHitValidityInSeconds: env.OTP_HIT_VALIDITY_IN_SECONDS
      ? Number(env.OTP_HIT_VALIDITY_IN_SECONDS)
      : 300,
    isOTPRateLimitActive: env.IS_OTP_RATE_LIMIT_ACTIVE,
    OTPRateLimit: env.OTP_RATE_LIMIT || 5,
    senderID: env.OTP_SENDER_ID || 'CofeApp',
    karixKey: env.OTP_KARIX_KEY,
    karixSMSBaseURL: env.OTP_KARIX_SMS_BASE_URL,
    karixSMSSenderId: env.OTP_KARIX_SMS_SENDER_ID || 'CofeApp',
    unifonicAppSid: env.OTP_UNIFONIC_APP_SID,
    unifonicSMSBaseURL: env.OTP_UNIFONIC_SMS_BASE_URL,
    unifonicSMSSenderId: env.OTP_UNIFONIC_SMS_SENDER_ID || 'Cofe App',
    cequensSMSBaseURL:  env.OTP_CEQUENS_SMS_BASE_URL,
    cequensSMSSenderId:  env.OTP_CEQUENS_SMS_SENDER_ID || 'Cofe App',
    cequensToken:  env.OTP_CEQUENS_TOKEN,
    victoryLinkSMSBaseURL:  env.OTP_VICTORY_LINK_SMS_BASE_URL,
    victoryLinkSMSSenderId:  env.OTP_VICTORY_LINK_SMS_SENDER_ID || 'Cofe App',
    victoryLinkUsername:  env.OTP_VICTORY_LINK_SMS_USERNAME,
    victoryLinkPassword:  env.OTP_VICTORY_LINK_SMS_PASSWORD,
    unifonicWhatsappSMSBaseURL:  env.OTP_UNIFONIC_WHATSAPP_SMS_BASE_URL,
    unifonicWhatsappPublicId:  env.OTP_UNIFONIC_WHATSAPP_PUBLIC_ID,
    unifonicWhatsappSecret:  env.OTP_UNIFONIC_WHATSAPP_SECRET,
    unifonicWhatsappTemplateName:  env.OTP_UNIFONIC_WHATSAPP_TEMPLATE_NAME || 'one_time_password_v1',
    mockEnabledEnvironments: ['development', 'staging'],
    mockOTP: 123456,
    simulateErrorInMock: false,
    mockEnabledPhoneNumbers: ['+905390000000', '+971559000000'],
    mockDisabledPhoneNumbers: ['+201501772511', '+201140278168', '+971585968794', '+971559042574', '+971585711876', '+923463312526'],
  },
  to_talabat: {
    awsAccessKeyId: env.AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    sqsRegion: env.SQS_DELIVERY_REGION,
    sqsQueueUrl: env.SQS_COFE_TO_TAC_QUEUE,
  },
  from_talabat: {
    awsAccessKeyId: env.AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    sqsRegion: env.SQS_DELIVERY_REGION,
    sqsQueueUrl: env.SQS_TAC_TO_COFE_QUEUE,
  },
  from_barq: {
    awsAccessKeyId: env.AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    sqsRegion: env.SQS_DELIVERY_REGION,
    sqsQueueUrl: env.SQS_BARQ_TO_COFE_QUEUE,
  },
  to_barq: {
    awsAccessKeyId: env.AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    sqsRegion: env.SQS_DELIVERY_REGION,
    sqsQueueUrl: env.SQS_COFE_TO_BARQ_QUEUE,
  },
  to_foodics: {
    awsAccessKeyId: env.AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    sqsRegion: env.SQS_DELIVERY_REGION,
    sqsQueueUrl: env.FAC_REPLY_QUEUE_URL,
  },
  foodics_order_queue: {
    awsAccessKeyId: env.AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    sqsRegion: env.SQS_DELIVERY_REGION,
    sqsQueueUrl: env.FOODICS_ORDER_QUEUE,
  },
  foodics: {
    awsAccessKeyId: env.AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    sqsRegion: env.SQS_DELIVERY_REGION,
    sqsQueueUrl: env.FAC_QUEUE_URL,
    authUrl: env.FAC_AUTH_URL,
    createDataLinks: env.FAC_DATA_LINK_URL,
    successUrl: env.VENDOR_PORTAL_URL_SUCCESS,
    failureUrl: env.VENDOR_PORTAL_URL_FAILURE,
  },
  adjust: {
    urlForInspectDevice: env.ADJUST_URL_FOR_INSPECT_DEVICE || 'https://api.adjust.com/device_service/api/v1/inspect_device',
    apiToken: env.ADJUST_API_TOKEN || 'xfwdAEnfsCCLN1isS9a-',
    appToken: env.ADJUST_APP_TOKEN || 'lgnj5g2vtdds',
  },
  xmlfeed: {
    s3Bucket: 'cofe-app-xml-feed',
    xmlFolderSegment1: 'src',
    xmlFolderSegment2: 'xmlfeeds'
  },
  maintenance: {
    tasleehUrl: env.TASLEEH_URL,
    tasleehApiKey: env.TASLEEH_API_KEY,
  },
  defaultBrandLocationContacts: {
    'EG': '+200221600040',
    'KW': '+96880073267',
    'OM': '+96880073267',
    'SA': '+9668008500858',
    'AE': '+971045207023',
  },
  orderRatingSlackUrl: {
    adminPortal: {
      baseUrl: env.ORDER_RATING_ADMIN_PORTAL_BASE_URL,
      ordersPage: 'orders',
      customersPage: 'reporting/customers',
    },
    SA: {
      url: env.ORDER_RATING_SA_SLACK_URL
    },
    AE: {
      url: env.ORDER_RATING_AE_SLACK_URL
    },
    KW: {
      url: env.ORDER_RATING_KW_SLACK_URL
    },
    EG: {
      url: env.ORDER_RATING_EG_SLACK_URL
    }
  },
  sharedApiKeys: [
    // TODO: it needs to be changed in the future for a sustainable structure
    { service: 'alexa', key: env.SHARED_API_KEYS_ALEXA },
  ],
  alexaDebugSlackWebhook: env.ALEXA_DEBUG_SLACK_WEBHOOK || env.ALEXA_DEBUG_SLACK_WEBHOOK,
  accountDeletionSlackUrl: env.ACCOUNT_DELETION_SLACK_URL || env.ACCOUNT_DELETION_SLACK_URL,
  smsAlertSlackUrl: env.SMS_ALERT_SLACK_URL || env.SMS_ALERT_SLACK_URL,
  cSubscription: {
    restEndpointsApiKey: env.C_SUBSCRIPTION_REST_ENDPOINTS_API_KEY,
    sqsRegion: env.C_SUBSCRIPTION_SQS_REGION,
    sqsQueueUrl: env.C_SUBSCRIPTION_FINISHING_SQS_URL,
    slackWebHook: env.SUBSCRIPTION_WEBHOOK_URL || (env.NODE_ENV === 'production'
      ? 'services/TQY240BDY/B0440CN6R8F/blj1eCNTEbe0xyQp5HSMG1N3'
      : 'services/TQY240BDY/B044ESH307M/ueP9DQJdmoRS4c7vsfHyO4SL'),
    countryUrls: {
      SA: env.NODE_ENV === 'production' ? env.SUBSCRIPTION_SA_SLACK_URL : env.SUBSCRIPTION_WEBHOOK_URL,
      AE: env.NODE_ENV === 'production' ? env.SUBSCRIPTION_AE_SLACK_URL : env.SUBSCRIPTION_WEBHOOK_URL,
      KW: env.NODE_ENV === 'production' ? env.SUBSCRIPTION_KW_SLACK_URL : env.SUBSCRIPTION_WEBHOOK_URL,
    }
  },
  branchAvailability: {
    restEndpointsApiKey: env.BRAND_LOCATION_OPENED_NOTIFICATION_API_KEY,
    redisTtlSeconds: env.AUTO_BRAND_LOCATION_STATUS_CACHE_TTL_SECONDS || 65,
    closingSoonInMinutes: env.STORE_CLOSING_SOON_IN_MINUTES || 10,
  },
  image: {
    sizeInBytes: 1024 * 1024 * 15,
    allowedExtensions: ['image/jpg', 'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4'],
    s3: {
      accessKeyId: env.AWS_ACCESS_KEY_ID_FOR_PORTAL_UPLOADER,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY_FOR_PORTAL_UPLOADER,
      bucket: env.GLOBAL_S3_UPLOAD_BUCKET,
      folderPath: `media/${env.NODE_ENV}`,
    },
  },
  analytics: {
    sqsQueueUrl: env.ANALYTICS_SQS_QUEUE_URL || env.ANALYTICS_SQS_QUEUE_URL,
    sqsRegion: env.ANALYTICS_SQS_REGION || env.ANALYTICS_SQS_REGION,
  },
  checkInconsistentData: {
    sqsQueueUrl: env.CHECK_INCONSISTENT_DATA_SQS_QUEUE_URL,
    sqsRegion: env.CHECK_INCONSISTENT_DATA_SQS_REGION,
  },
  serviceExchangeKey:
    env.SERVICE_EXCHANGE_KEY || 'jJ8mkGamVGy7xMZXug1ydKJpieLpBJpZ',
  ecommerce: {
    paymentWebhook: env.ECOM_PAYMENT_WEBHOOK,
    paymentCallback: env.ECOM_PAYMENT_CALLBACK,
    paymentMfCallback: env.ECOM_PAYMENT_MF_CALLBACK,
    paymentTapCallback: env.ECOM_PAYMENT_TAP_CALLBACK || 'https://ecom-dev-orders.cofeapp.com/v1/payment-tap-callback',
  },
  ecommercePortalUrl: env.ECOM_PORTAL_URL || 'https://ecom-dev-backoffice.cofeapp.com/',
  uploadFile: {
    sizeInBytes: 1024 * 1024 * 15,
    allowedExtensions: ['text/csv'],
    s3: {
      accessKeyId: env.AWS_ACCESS_KEY_ID_FOR_PORTAL_UPLOADER,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY_FOR_PORTAL_UPLOADER,
      bucket: 'content.cofeadmin.com',
      folderPath: `upload-files/${env.NODE_ENV}`,
    },
  },
  SNSTopics: {
    'order-placed': env.SNS_TOPIC_ORDER_PLACED,
    'order-completed': env.SNS_TOPIC_ORDER_COMPLETED,
  },
  bulkOrderSetStatusUpdateLimit: env.BULK_ORDER_STATUS_UPDATE_LIMIT || 10,
  stampReward: {
    enable: env.ENABLE_STAMP_REWARD,
    counterMaxValue: env.STAMP_REWARD_COUNTER_MAX_VALUE,
    autoApply: env.STAMP_REWARD_AUTO_APPLY,
    priceOperatorToApply: env.STAMP_REWARD_PRICE_OPERATOR_TO_APPLY || 'HIGGEST',
    priceRuleMinValueToApply: env.STAMP_REWARD_PRICE_RULE_MIN_VALUE_TO_APPLY || 0,
    priceRuleMaxValueToApply: env.STAMP_REWARD_PRICE_RULE_MAX_VALUE_TO_APPLY || 0
  }
};
