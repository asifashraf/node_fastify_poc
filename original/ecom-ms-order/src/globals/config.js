require('dotenv').config({ silent: true });

const env = Object.assign(
    { NODE_ENV: 'development' },
    process.env
);

const isTest = env.NODE_ENV.indexOf('test') > -1;

module.exports = {
    timezone: env.TIMEZONE || 'Asia/Kuwait',
    env: env.NODE_ENV,
    isProd: env.NODE_ENV === 'production',
    isDev:
        env.NODE_ENV === 'development' ||
        env.NODE_ENV === 'local' ||
        env.NODE_ENV === 'staging',
    isSwagger: env.SWAGGER_ENABLED || false,
    isTest,
    apiPrefix: env.API_PREFIX || 'v1',
    port: env.PORT || 3000,
    host: env.HOST || 'localhost',
    logLevel: env.LOG_LEVEL || 10,
    serverUrl: env.SERVER_URL || 'localhost',
    redis: {
        host: env.REDIS_HOST || 'localhost',
        port: env.REDIS_PORT || 6739
    },
    db: {
        pgsql: {
            host: env.DB_HOST || 'localhost',
            port: env.DB_PORT || 5432,
            database: env.DB_NAME || 'dbname',
            user: env.DB_USER || 'postgres',
            password: env.DB_PASSWORD || ''
        }
    },
    jwt: {
        secret: "9e06765b-93bc-4e07-bc59-2e666a51bb0b"
    },
    per_page : 10,
    languages : {
        'en' : env.EN_LANG_ID || '0025fc96-cae0-44f2-8203-c52101ab1a48',
        'ar' : env.AR_LANG_ID || 'c8dc11a8-6931-4b97-a1c5-f29fb380d167',
        'tr' : env.TR_LANG_ID || '9dea356b-201e-45b4-8a5f-139a08dba2af',
    },
    cofeSuppliers : {
        'AE' : env.COFE_SUPPLIER_UAE || 'd35dfedf-8f34-4dd0-a04a-4e18b98cfc6f',
        'SA' : env.COFE_SUPPLIER_KSA || '8720b68f-8367-4596-bba3-77192cb5e808',
        'KW' : env.COFE_SUPPLIER_KWT || 'd35dfedf-8f34-4dd0-a04a-4e18b98cfc6f',
    },
    elk: {
        user: env.ELK_USERNAME || '',
        password: env.ELK_PASSWORD || '',
        host: env.ELK_HOST || 'localhost',
        port: env.ELK_PORT || '443'
    },
    slack: {
        channel: env.SLACK_CHANNEL || '',
    },
    enableSlackWebhooks: env.ENABLE_SLACK_WEBHOOKS === 'false' ? false : true,
    default_country : env.DEFAULT_COUNTRY || 'SA',
    completedStateIds : ['d3e69e9f-afaa-4ebf-aabb-a12a01f1750e', '13d518d2-14fb-4014-a19a-efe21a74066e', '912853f4-9d0e-4b87-92ec-90e4254f20d8'],
    notificationStates : ['13d518d2-14fb-4014-a19a-efe21a74066e', 'ec465358-a1b1-44e3-a298-a14079f86825',
        'd3e69e9f-afaa-4ebf-aabb-a12a01f1750e' ],
    failureStateIds: ['dfe81d0e-acdc-4465-a0d8-dada96e3cd63', '499265bb-c3d2-4cc5-bfea-dd5d3376f266'],
    default_uuid: env.DEFAULT_UUID || '0facccb7-77e8-4bd1-b3b6-351cbc21dd9c',
    productModuleUrl: env.PRODUCT_MODULE_URL || 'localhost',
    discountModuleUrl: env.DISCOUNT_MODULE_URL || 'localhost',
    backofficeModuleUrl: env.BACKOFFICE_MODULE_URL || 'localhost',
    coreModuleUrl: env.CORE_MODULE_URL || 'localhost',
    cartModuleUrl: env.CART_MODULE_URL || 'localhost',
    deliveryModuleUrl: env.DELIVERY_MODULE_URL || 'localhost',
    websiteBaseUrl: env.WEBSITE_BASE_URL || 'https://ecom-dev-website.cofeapp.com/',
    swaggerHost: env.SWAGGER_HOST || 'ecom-dev-product.cofeapp.com',
    cloudfront_url : env.AWS_S3_URL || `https://s3.eu-west-1.amazonaws.com/ecom-dev-bucket/ecom/${process.env.NODE_ENV}/`,
    cofeDistrictUrl: env.COFE_DISTRICT_URL || 'localhost',
    serviceExchangeKey: env.SERVICE_EXCHANGE_KEY || 'jJ8mkGamVGy7xMZXug1ydKJpieLpBJpZ',
    product_bucket : 'products/',
    paymentIcons: {
        'APPLE_PAY': 'https://cofe-app-uploads.s3-eu-west-1.amazonaws.com/payment-methods/ApplePay.png',
        'GOOGLE_PAY': 'https://cofe-app-uploads.s3-eu-west-1.amazonaws.com/payment-methods/GooglePay.png',
        'CASH': 'https://cofe-app-uploads.s3-eu-west-1.amazonaws.com/payment-methods/Cash.png',
        'SAVED_CARD': 'https://cofe-app-uploads.s3-eu-west-1.amazonaws.com/payment-methods/VisaMastercard.png', // VISA/MASTER
        'CARD': 'https://cofe-app-uploads.s3-eu-west-1.amazonaws.com/payment-methods/VisaMastercard.png', // VISA/MASTER
        'CREDIT': 'https://cofe-app-uploads.s3-eu-west-1.amazonaws.com/payment-methods/Credits.png',
        'KNET': 'https://cofe-app-uploads.s3-eu-west-1.amazonaws.com/payment-methods/Knet.png',
        'TABBY': 'https://ecom-s3-prod.s3.eu-west-1.amazonaws.com/ecom/production/payment_methods/377683c1-e33a-41c4-9893-a21adbbae914.png'
    },
    slackOrderHooks : {
        'AE': env.ORDER_SLACK_AE || 'https://hooks.slack.com/services/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',
        'SA': env.ORDER_SLACK_SA || 'https://hooks.slack.com/services/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',
        'KW': env.ORDER_SLACK_KW || 'https://hooks.slack.com/services/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'
    },
    deepLink: 'cofeapp://cofeapp.com/marketplace/',
    sesKeys: {
        region: env.AWS_SES_REGION,
        accessKeyId:  env.AWS_SES_ACCESS_KEY,
        secretAccessKey: env.AWS_SES_SECRET_ACCESS_KEY
    },
    orderNotificationEmailSender: env.EMAIL_SENDER || 'no-reply@cofeapp.com',
    cofeSupportEmail: env.COFE_SUPPORT_EMAIL || 'help@cofeapp.com',
    cofeSupportPhone: env.COFE_SUPPORT_PHONE || '9407 6666',
    cofeOperationsEmailKSA: env.COFE_OPERATIONS_MAIL_KSA,
    cofeOperationsEmailUAE: env.COFE_OPERATIONS_MAIL_UAE,
    cofeOperationsEmailUAE2: env.COFE_OPERATIONS_MAIL_UAE2,
    cofeOperationsEmailKWT: env.COFE_OPERATIONS_MAIL_KWT,
    cofePortalUrl: env.ECOM_PORTAL_URL,
    applePayKuwait: env.APPLE_PAY_KUWAIT || 'mf_11',
    tabbyUrl: env.TABBY_URL || 'https://api.tabby.ai/api/v2/payments',
    tabbySecretKey: env.TABBY_SECRET_KEY || 'sk_test_d5cee03e-07c1-44f3-9c22-f65d96ee26de',
    useCustomChromiumExecutable: env.USE_CUSTOM_CHROMIUM_EXECUTABLE || 'true',
    chromiumPath: env.CHROMIUM_PATH || '/usr/bin/chromium-browser',
    portalUrl: env.PORAL_URL || 'https://ecom-dev-backoffice.cofeapp.com',
    supplierSMS: env.SUPPLIER_SMS || false,
    customerCareEmails: env.CUSTOMER_CARE_EMAILS ? env.CUSTOMER_CARE_EMAILS.split(", ") : [],
    locales: env.LOCALES ? env.LOCALES.split(", ") : ['en', 'ar']
};
