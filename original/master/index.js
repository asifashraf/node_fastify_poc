// eslint-disable-next-line no-unused-vars
const masterConfig = require('./master-config');

masterConfig.initialize().then(() => {
  require('./src/lib/elastic-apm');

  const knex = require('./database');

  const roDb = require('./database/ro');

  const redis = require('./redis');

  const { run } = require('./src');

  run(process.env, { handle: knex, roHandle: roDb }, redis, {}).catch(ex => {
    console.error('Exception while executing run', ex);
  });
}).catch(ex => {
  console.error(`Exception while attempting to initialize master config >`, ex)
  process.exit(1);
});

