const knex = require('./index');
const SlackWebHookManager = require('../src/schema/slack-webhook-manager/slack-webhook-manager');
const os = require('os');

function runMigrations() {
  if (process?.argv?.includes('localDev')) {
    return Promise.reject('Migration steps are bypassed.');
  }
  console.log('Checking for database migrations...');
  return knex.migrate
    .latest()
    .then(result => {
      console.log('Ran', result[1].length, 'migration(s)');
      return knex.migrate.currentVersion();
    })
    .then(version => {
      SlackWebHookManager.sendTextToSlack(`[APP_STARTED_MIGRATION-SUCCESS][${os.hostname()}] [Current version of database: ${version}]`).then(r => console.log(r));
      console.log('Current version of database: ', version);
    })
    .catch(err => {
      SlackWebHookManager.sendTextToSlack(`[APP_STARTED_MIGRATION-FAIL][${os.hostname()}] [${err}]`).then(r => console.log(r));
      console.log(err);
    });
}

// automatically run migrations
module.exports = runMigrations;
