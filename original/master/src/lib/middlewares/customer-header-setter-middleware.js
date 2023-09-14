const { uuid } = require('../../lib/util');
const customHeaderSetter = async (serverConfig, req, res, next) => {
  req.clientIp = req.headers['x-forwarded-for']?.split(',').shift() || req.socket?.remoteAddress.replace(/^.*:/, '') || null;
  req.requestId = uuid.get();
  req.xAppOs = req.headers['x-app-os'] || null;
  req.xAppVersion = req.headers['x-app-version'] || null;
  req.userAgent = req.headers['user-agent'] || null;
  req.srcPlatform = req.headers['src-platform'] || 'admin-portal'; // in case of web portals
  req.clientPlatform = req.headers['apollographql-client-name'] || null;
  req.xDeviceId = req.headers.deviceId || req.headers.deviceid || null;
  req.xDeviceIdentifierType =
    req.headers.deviceIdentifierType ||
    req.headers.deviceidentifiertype ||
    null;
  req.sqlCacheEnabled = Boolean(req.xAppOs);
  // so we can directly access server config on req object
  req.serverConfig = {
    serverPort: serverConfig.serverPort,
    skipMigrations: serverConfig.skipMigrations,
    db: serverConfig.db,
    redis: serverConfig.redis,
    mockUser: serverConfig.mockUser,
    uuidFn: serverConfig.uuidFn,
    timeOverride: serverConfig.timeOverride,
    nowFn: serverConfig.nowFn,
    schema: serverConfig.schema,
  };
  return next();
};

module.exports = customHeaderSetter;
