/* eslint-disable camelcase */
const http = require('http');
const bodyParser = require('body-parser');
const compression = require('compression');
const express = require('express');
const path = require('path');
const cors = require('cors');
const { ApolloServer } = require('apollo-server-express');
const { ApolloServerPluginDrainHttpServer, ApolloServerPluginLandingPageDisabled } = require('apollo-server-core');
const responseCachePlugin = require('apollo-server-plugin-response-cache').default;
const { RedisCache } = require('apollo-server-cache-redis');
const { extend, replace } = require('lodash');
const { SubscriptionServer } = require('subscriptions-transport-ws');
const { execute, subscribe } = require('graphql');
const { getAdminPermissions, getAdminRoles } = require('./lib/auth');
const QueryContext = require('./query-context');
const { pubsub, hashString } = require('./lib/util');
const { auth0IosConfig } = require('./controllers/root-controller');
const { basicAuthMiddleware, tokenAuthMiddleware } = require('./lib/auth');
const customHeaderSetter = require('./lib/middlewares/customer-header-setter-middleware');
const customErrorHandler = require('./lib/middlewares/custom-error-handler-middleware');
const customAuthMiddleware = require('./lib/middlewares/auth-middleware');
const graphqlRequestResponseMiddleware = require('./lib/middlewares/graphql-request-response-logger-middleware');
const sqlLogger = require('./lib/middlewares/sql-logger-middleware');
const texpressConsumer = require('./lib/consumers/texpress-consumer');
const barqConsumer = require('./lib/consumers/barq-consumer');
const notificationConsumer = require('./lib/consumers/notification-consumer');
const foodicsConsumer = require('./lib/consumers/foodics-consumer');
const checkSubscriptionsFinishStatusConsumer = require('./lib/consumers/check-subscriptions-finish-status-consumer');
const finishCustomerSubscriptionConsumer = require('./lib/consumers/finish-customer-subscription-consumer');
const mposOrderConsumer = require('./lib/consumers/mpos-order-consumer');
const sendAnalyticsEventConsumer = require('./lib/consumers/send-analytics-event-consumer');
const checkInconsistentDataConsumer = require('./lib/consumers/check-inconsistent-data-consumer');
const foodicsOrderQueueConsumer = require('./lib/consumers/foodics-order-queue');
const {
  serverTimeMiddleware,
  setUuidFn,
  setNowFn,
  setDateTimeConfig,
} = require('./lib/util');
const {
  setupAuthContext,
  setupQueryContextWithoutAuth,
} = require('./helpers/context-helpers');
const {
  isDev,
  defaultUserId,
  isProd,
  isTest,
  apolloEngineKey,
  isTracingEnabled,
  isCacheControlEnabled,
  timezone,
  redis: redisConfig, alexaDebugSlackWebhook,
  enableTalabatIntegration,
  enableBarqIntegration,
  enableNotificationIntegration,
  enableFoodicsIntegration,
  enableMposOrderIntegration,
  enableCheckSubscriptionsFinishStatusIntegration,
  enableFinishCustomerSubscriptionIntegration,
  enableSendAnalyticsEvent,
  enableCheckInconsistentData
} = require('../config');

const firebase = require('./lib/firebase');

const formatErrorDev = error => error;

const { customerDeviceMetadataAssociation } = require('./schema/customer-device-metadata/association-helper');
const { adjustDeviceTypeIdentifiers } = require('./schema/root/enums');
const SlackWebHookManager = require('./schema/slack-webhook-manager/slack-webhook-manager');

// eslint-disable-next-line max-params
const getApp = async (
  { serverPort, skipMigrations },
  db,
  redis,
  { mockUser, uuidFn, timeOverride, nowFn },
  localSchema,
) => {
  if (uuidFn) {
    setUuidFn(uuidFn);
  }
  if (nowFn) {
    setNowFn(nowFn);
  }
  if (timeOverride) {
    setDateTimeConfig(timeOverride);
  }

  //runMigrations().then(() => console.log('migrations applied')).catch(r => console.log(r));

  const schema = localSchema ? localSchema : require('./schema-loader')();

  const serverConfig = {
    serverPort,
    skipMigrations,
    db,
    redis,
    mockUser,
    uuidFn,
    timeOverride,
    nowFn,
    schema,
  };

  const app = express();
  const httpServer = http.createServer(app);
  app.use(compression());
  app.disable('x-powered-by');

  // view engine setup
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'twig');

  app.use(cors());
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
  app.use((req, res, next) => {
    return customHeaderSetter(serverConfig, req, res, next);
  });
  app.use((req, res, next) => {
    return sqlLogger(db, req, res, next);
  });

  const formatError = isProd ? null : formatErrorDev;

  const redisConnectionString = isTest
    ? redisConfig.testConnection
    : redisConfig.connection;

  console.log('redisConnectionString is :', redisConnectionString);
  const redisCache = new RedisCache(redisConnectionString);

  const subscriptionServer = SubscriptionServer.create(
    {
      execute,
      subscribe,
      schema,
      onConnect: async connectionParams => {
        const { authorization: tokenBearer, subscriptionClientName: client, deviceId } = connectionParams;
        if (client && client === 'MPOS') {
          if (deviceId) {
            const user = {
              sub: deviceId,
              roles: [],
              permissions: [],
            };
            return new QueryContext(db, redis, user, pubsub, schema);
          } else throw new Error('No device!');
        } else {
          const authToken = replace(tokenBearer, 'Bearer ', '');
          if (authToken === 'null') throw new Error('No token Provided !');
          try {
            const user = await firebase.getIdentity(authToken);
            user.sub = user.uid;
            user.name = user.displayName;
            user.permissions = user.uid
              ? await getAdminPermissions(db.handle)(user.uid)
              : [];
            user.roles = user.uid
              ? await getAdminRoles(db.handle)(user.uid)
              : [];
            if (isDev && !isTest && defaultUserId) {
              extend(user, { id: defaultUserId });
            }
            return new QueryContext(db, redis, user, pubsub, schema);
          } catch (err) {
            throw new Error('Authentication Failure!');
          }
        }
      },
    },
    {
      server: httpServer,
      path: '/subscriptions',
    },
  );

  const secureIntrospection = {
    requestDidStart: ({ request, context }) => {
      if (
        (request.query.includes('__schema') ||
          request.query.includes('__type')) &&
        !context.req.get('x-cofe-cloud-introspect')
      ) {
        throw new Error('GraphQL introspection not authorized!');
      }
    }
  }

  const graphQLPath = '/graphql';
  const graphQLServer = new ApolloServer({
    schema,
    async context({ req }) {
      const ctx = await setupAuthContext(req);
      ctx.req = req;
      getDeviceMetadata(ctx)
        .catch(err => console.log('getDeviceMetadata err:', err));
      return ctx;
    },
    formatError,
    tracing: isTracingEnabled,
    cache: redisCache,
    cacheControl: isCacheControlEnabled,
    engine: Boolean(apolloEngineKey),
    plugins: [
      secureIntrospection,
      ApolloServerPluginDrainHttpServer({ httpServer }),
      ApolloServerPluginLandingPageDisabled(),
      responseCachePlugin({ cache: redisCache }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              subscriptionServer.close();
            },
          };
        },
      },
      {
        async requestDidStart(requestContext) {
          return {
            async willSendResponse(requestContext) {
              try {
                // TODO: WILL BE REMOVED
                try {
                  const req = requestContext.context.req;
                  const clientOs = (req && req.headers) ? req.headers['apollographql-client-name'] || req.headers['x-app-os'] : null;
                  const xApiKey = req.headers['x-api-key'] || req.headers['X-API-KEY'] || 'no-key';
                  if (clientOs && clientOs === 'alexa') {
                    let isError = !!requestContext.errors;
                    if (isError === false) {
                      Object.entries(requestContext.response?.data).forEach(entry => {
                        const [keyX] = entry;
                        if (keyX && requestContext.response?.data[keyX]) {
                          Object.entries(requestContext.response?.data[keyX]).forEach(entry => {
                            const [keyY] = entry;
                            if (['error', 'errors', 'errorBody'].includes(keyY) && requestContext.response?.data[keyX][keyY]) {
                              isError = true;
                            }
                          });
                        }
                      });
                    }
                    if (isError) {
                      const msgObj = {
                        query: requestContext.request.query,
                        variables: requestContext.request.variables,
                        response: requestContext.response.data,
                        errors: requestContext.errors,
                        xApiKey: `${xApiKey.substring(0, 10)}...`,
                      };
                      SlackWebHookManager.sendTextToSlack(JSON.stringify(msgObj), alexaDebugSlackWebhook);
                    }
                  }
                } catch (e) {
                  console.log('willSendResponse_alexa', e);
                }
                // TODO: WILL BE REMOVED
                if (requestContext.errors) {
                  const { request, response, errors } = requestContext;
                  const { operationName, query, variables } = request;
                  const { data } = response;
                  const allErrors = errors.map(t => {
                    return {
                      message: t.originalError?.message,
                      stack: t.originalError?.stack,
                    };
                  });
                  const logObj = {
                    request: { operationName, query, variables },
                    response: { data },
                    errors: allErrors,
                  };
                  requestContext.context.kinesisLogger.sendLogEvent(logObj, 'global-graphql-error');
                }
                if (requestContext.operationName
                  && requestContext.response
                  && requestContext.response.data
                  && requestContext.response.data[requestContext.operationName]
                  && (requestContext.response.data[requestContext.operationName].error
                    || requestContext.response.data[requestContext.operationName].errors)) {
                  const { request, response } = requestContext;
                  const { operationName, query, variables } = request;
                  const { data } = response;
                  const logObj = {
                    request: { operationName, query, variables },
                    response: { data },
                  };
                  requestContext.context.kinesisLogger.sendLogEvent(logObj, 'global-graphql-data-error');
                }
              } catch (e) {
                console.log('requestDidStart-error:', e);
              }
            },
          };
        },
      },
    ],
    introspection: !isProd,
  });
  await graphQLServer.start();

  // The Main Request Flow is actually here, then goes to
  // graphQLServer = new ApolloServer({ ... line
  app.use(
    graphQLPath,
    serverTimeMiddleware,
    customAuthMiddleware,
    graphqlRequestResponseMiddleware
  );
  graphQLServer.applyMiddleware({
    app,
    path: graphQLPath,
  });

  if (!isProd) {
    // Graph doc endpoint
    app.use(
      '/schema',
      basicAuthMiddleware,
      express.static(path.join(__dirname, '../doc/schema')),
    );
  }
  // This Query Context is used in other places as well in this file
  const queryContextWithoutAuth = setupQueryContextWithoutAuth(serverConfig);
  app.queryContextWithoutAuth = queryContextWithoutAuth;

  if (enableTalabatIntegration) texpressConsumer(queryContextWithoutAuth);

  if (enableBarqIntegration) barqConsumer(queryContextWithoutAuth);
  
  if (enableNotificationIntegration) notificationConsumer(queryContextWithoutAuth);
  
  if (enableMposOrderIntegration) mposOrderConsumer(queryContextWithoutAuth);
  
  if (enableCheckSubscriptionsFinishStatusIntegration) checkSubscriptionsFinishStatusConsumer(queryContextWithoutAuth);
  
  if (enableFinishCustomerSubscriptionIntegration) finishCustomerSubscriptionConsumer(queryContextWithoutAuth);
 
  if (enableSendAnalyticsEvent) sendAnalyticsEventConsumer(queryContextWithoutAuth);
  
  if (enableCheckInconsistentData) checkInconsistentDataConsumer(queryContextWithoutAuth);

  if (enableFoodicsIntegration) {
    foodicsConsumer(queryContextWithoutAuth);
    foodicsOrderQueueConsumer(queryContextWithoutAuth);
  }

  require('./lib/cronjobs')(queryContextWithoutAuth);

  // Auth0 IOS
  // If you move it to routes.js it stops working
  app.use('/config/init', tokenAuthMiddleware, auth0IosConfig);
  require('./routes')(app);

  app.use(customErrorHandler);
  return { graphQLServer, app, httpServer };
};

const getDeviceMetadata = async ctx => {
  try {
    const req = ctx.req;
    if (req) {
      const customerId =
        req.auth?.id ||
        req.user?.id ||
        null;
      if (customerId) {
        let deviceId =
          req.headers.deviceId ||
          req.headers.deviceid ||
          null;
        let isSetDeviceIdFromClient = true;
        if (!deviceId) {
          isSetDeviceIdFromClient = false;
          // if there is no deviceId from client, we use md5(customerId)
          deviceId = hashString(customerId);
        }
        if (deviceId) {
          const deviceIdentifierType =
            isSetDeviceIdFromClient
              ? req.headers.deviceIdentifierType ||
              req.headers.deviceidentifiertype ||
              null
              : adjustDeviceTypeIdentifiers.HASH;
          if (customerId && deviceId && deviceIdentifierType) {
            customerDeviceMetadataAssociation(
              ctx,
              customerId,
              deviceIdentifierType,
              deviceId
            )
              .catch(err => console.log('customerDeviceMetadataAssociation-1 scope error:', err));
          }
        }
      }
    }
  } catch (err) {
    console.log('customerDeviceMetadataAssociation-2 scope error:', err);
  }
};

const getTestApp = async () => {
  const getPort = require('get-port');
  const serverPort = await getPort();
  const { testDb, redis, mockUser } = require('./lib/test-util');
  const casual = require('casual');
  const { constant } = require('lodash');
  const app = getApp({ serverPort, skipMigrations: true }, testDb, redis, {
    mockUser,
    uuidFn: casual._uuid,
    nowFn: constant('2017-11-15T12:30:00+03:00'),
    timeOverride: {
      zone: timezone,
      year: 2017,
      month: 11,
      day: 15,
      hour: 12,
      minute: 30,
    },
  });
  return app;
};

module.exports = { getApp, getTestApp };
