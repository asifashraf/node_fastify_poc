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
    cloudfront_url : env.AWS_S3_URL || `https://s3.eu-west-1.amazonaws.com/ecom-dev-bucket/ecom/${process.env.NODE_ENV}/`,
    default_image_url : "https://example.cloudfront.net/",
    default_supplier_image : env.DEFAULT_SUPPLIER_IMAGE || '19a7a7e6-9e30-4501-a7b8-67572b1e24bd.png',
    category_bucket : "category/",
    manufacturer_bucket : "manufacturers/",
    offer_bucket : "offers/",
    product_bucket : "products/",
    supplier_bucket : "suppliers/",
    default_country : env.DEFAULT_COUNTRY || 'SA',
    default_uuid: env.DEFAULT_UUID || '0facccb7-77e8-4bd1-b3b6-351cbc21dd9c',
    coreModuleUrl: env.CORE_MODULE_URL || 'localhost',
    cartModuleUrl: env.CART_MODULE_URL || 'localhost',
    backofficeMsUrl: env.BACKOFFICE_MS_URL || 'localhost',
    swaggerHost: env.SWAGGER_HOST || 'ecom-dev-product.cofeapp.com',
    algoliaAppId: env.ALGOLIA_APP_ID || 'PGJPVWCVB0',
    algoliaAdminKey: env.ALGOLIA_ADMIN_KEY || 'b9c770194777856c63900af4b13e9fe1',
    algoliaIndexUae: env.ALGOLIA_INDEX_UAE || 'products_ae',
    algoliaIndexKsa: env.ALGOLIA_INDEX_KSA || 'products_sa',
    algoliaIndexKwt: env.ALGOLIA_INDEX_KWT || 'products_kw',
    percentageIcon: env.PERCENTAGE_ICON || 'f51d06ec-6daf-418c-b580-3563636fedb7.png',
    sesKeys: {
        region: env.AWS_SES_REGION,
        accessKeyId:  env.AWS_SES_ACCESS_KEY,
        secretAccessKey: env.AWS_SES_SECRET_ACCESS_KEY
    },
    emailSender: env.EMAIL_SENDER || 'no-reply@cofeapp.com',
    locales: env.LOCALES ? env.LOCALES.split(", ") : ['en', 'ar']
};
