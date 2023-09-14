const { sendLogEvent, kinesisEventTypes } = require('../aws-kinesis-logging');
const { get } = require('lodash');
const { some } = require('lodash/collection');
const declineQueryList = [
  'IntrospectionQuery',
  'ngLocationsInRadiusLite',
  'getLastNotRatedOrderWithQuestionByCustomer',
  'orderSetToBeTracked',
  'orderSetsByAuth',
  'newBrandsLite',
  'storeFeedLite',
  'config',
  'countryConfigs',
];

const graphqlRequestResponseMiddleware = async (req, res, next) => {
  if (req.body && req.body.query) {
    try {
      if (!some(declineQueryList, t => req.body.query.includes(t))) {
        res.on('finish', async () => {
          const userId = get(req.user, 'sub') || undefined;
          const authProvider = get(req.user, 'authProvider') || undefined;
          const token = req.headers?.authorization || undefined;
          const requestId = req.requestId || 'out-of-context';
          const clientVer = (req && req.headers && req.headers['apollographql-client-version'])
            ? req.headers['apollographql-client-version']
            : undefined;
          const clientOs = (req && req.headers && req.headers['apollographql-client-name'])
            ? req.headers['apollographql-client-name']
            : undefined;
          const clientUserAgent = (req && req.headers && req.headers['user-agent'])
            ? req.headers['user-agent']
            : undefined;
          const deviceId = (req && req.headers && req.headers.deviceId || req.headers.deviceid)
            ? (req.headers.deviceId || req.headers.deviceid)
            : undefined;
          const deviceIdentifierType = (req && req.headers && req.headers.deviceIdentifierType || req.headers.deviceidentifiertype)
            ? (req.headers.deviceIdentifierType || req.headers.deviceidentifiertype)
            : undefined;
          const msgObj = {
            requestId,
            authProvider,
            token,
            userId,
            clientOs,
            clientVer,
            clientUserAgent,
            ip: req.clientIp,
            deviceId,
            deviceIdentifierType,
            data: {
              operationName: req.body.operationName
                ? req.body.operationName
                : 'Unknown',
              body: req.body || 'Unknown',
            },
          };
          sendLogEvent(
            msgObj,
            kinesisEventTypes.graphqlRequestResponse,
          ).catch(err => {
            console.log('GraphQL Request Response Error:', err);
          });
        });
      }
    } catch (e) {
      console.log('graphqlRequestResponseMiddleware-error', e);
    }
  }
  return next();
};

module.exports = graphqlRequestResponseMiddleware;
