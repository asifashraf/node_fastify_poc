const { get } = require('lodash');
const kinesisLogger = require('./../aws-kinesis-logging');
const SlackWebHookManager = require('./../../schema/slack-webhook-manager/slack-webhook-manager');

const sqlLoggerMiddleware = async (db, req, res, next) => {
  try {
    const content = (request, data) => {
      const userId = get(request.user, 'sub') || undefined;
      const authProvider = get(request.user, 'authProvider') || undefined;
      const token = request.headers?.authorization || undefined;
      const requestId = request.requestId || 'out-of-context';
      const clientVer = (request && request.headers && request.headers['apollographql-client-version'])
        ? request.headers['apollographql-client-version']
        : undefined;
      const clientOs = (request && request.headers && request.headers['apollographql-client-name'])
        ? request.headers['apollographql-client-name']
        : undefined;
      const clientUserAgent = (request && request.headers && request.headers['user-agent'])
        ? request.headers['user-agent']
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
        data,
      };
      return msgObj;
    };

    const logAllSQL = (data) => {
      const cleanSql = data?.sql?.trim().toLowerCase();
      const onlySqlCommand = cleanSql?.replace(/[^a-zA-Z ]/g, '');
      const firstCommand = onlySqlCommand?.trim().split(' ')[0]?.trim();
      const ddlCommands = ['create', 'drop', 'alter', 'truncate'];
      if (ddlCommands.some(t => t === firstCommand)) {
        SlackWebHookManager.sendTextToSlack(
          `
[!!!SQLDDLDenied!!!]
Query: ${data.sql}
IP: ${req.clientIp} / RequestId: ${req.requestId}
`);
        throw new Error('INTERNAL_SERVER_ERROR');
      }
    };
    const logErrorSQL = (error, obj) => {
      const eventTypeName = 'sqlLog_error';
      const payload = { knexId: obj['__knexQueryUid'], message: error.message };
      kinesisLogger.sendLogEvent(content(req, payload), eventTypeName)
        .catch(e => console.log(e));
    };

    // SQL LOG
    if (db.handle.listenerCount('query') === 0) {
      db.handle.on('query', (data) => logAllSQL(data));
    }
    if (db.handle.listenerCount('query-error') === 0) {
      db.handle.on('query-error', (error, obj) => {
        console.error(`queryError >`, { error, obj });
        logErrorSQL(error, obj);
        throw new Error('INTERNAL_SERVER_ERROR');
      });
    }

    if (db.roHandle) {
      if (db.roHandle.listenerCount('query') === 0) {
        db.roHandle.on('query', (data) => logAllSQL(data));
      }
      if (db.roHandle.listenerCount('query-error') === 0) {
        db.roHandle.on('query-error', (error, obj) => {
          console.error(`queryError >`, { error, obj });
          logErrorSQL(error, obj);
          throw new Error('INTERNAL_SERVER_ERROR');
        });
      }
    }
  } catch (ex) {
    console.error('SQLError', { ex });
  }

  return next();
};

module.exports = sqlLoggerMiddleware;
