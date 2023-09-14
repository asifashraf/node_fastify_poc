const { collectConfig } = require('./src/lib/aws-secret-manager');
// eslint-disable-next-line no-unused-vars
collectConfig().then(async function (error, res) {
  // console.log('from index file', global.secrets);
  const knex = require('./database');
  const roDb = require('./database/ro');
  const redis = require('./redis');
  const { run } = require('./src');
  const server = await run(process.env, { handle: knex, roHandle: roDb }, redis, {})
    .catch(err => {
      console.log('Run Server caught error : ', err);
    });
  const startGracefulShutdown = () => {
    console.log('Starting shutdown...');
    if (server) {
      server.close(() => {
        console.log('server destroyed.');
      });
    }
    if (knex) {
      knex.destroy().then(r => console.log('knex destroyed'));
    }
    if (roDb) {
      roDb.destroy().then(r => console.log('roDb destroyed'));
    }
    if (redis) {
      redis.disconnect();
      console.log('redis destroyed');
    }
    console.log('Shutdown process is done...');
  };

  process.on('SIGTERM', startGracefulShutdown);
  process.on('SIGINT', startGracefulShutdown);
});
