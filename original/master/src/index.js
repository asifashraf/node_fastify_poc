const loadSchema = require('./schema-loader');
const { displayServer } = require('./lib/util');


async function run(
  { PORT: serverPort = 8081, SKIP_MIGRATIONS: skipMigrations = false },
  db,
  redis,
  { mockUser, uuidFn, timeOverride, nowFn },
) {
  let schema;
  try {
    schema = loadSchema();
  } catch (err) {
    console.log(err);
  }

  const { getApp } = require('./app');
  const { httpServer } = await getApp(
    { serverPort: global.secrets.PORT || serverPort, skipMigrations },
    db,
    redis,
    {
      mockUser,
      uuidFn,
      timeOverride,
      nowFn,
    },
    schema,
  );

  // need to use http's createServer to have ability to shut the server down
  // Added this for Subscriptions
  httpServer.listen({ port: global.secrets.PORT || serverPort }, () => {
    return displayServer(httpServer);
  });
  // to prevent 502 errors from ELB
  httpServer.keepAliveTimeout = 61 * 1000;
  httpServer.headersTimeout = 65 * 1000;
  return httpServer;
}

module.exports = {
  run,
};
