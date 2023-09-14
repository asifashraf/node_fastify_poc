const db = require('../../database');
const { map } = require('lodash');
const Promise = require('bluebird');
const { topicArns } = require('../../config').notifications;
const RateLimiter = require('limiter').RateLimiter;

async function run(db) {
  const pushDeviceTokens = await getAllTokens(db);
  console.log(`Got ${pushDeviceTokens.length} push device tokens`);

  // Select distinct reveals this are the 3 apps in use today
  const appTopicMap = {
    GCM: topicArns.GCM,
    APNS: topicArns.APNS,
    // eslint-disable-next-line
    Cofe_iOS_BPXL_Sandbox: topicArns.APNS,
  };

  const topics = map(pushDeviceTokens, token => {
    return {
      endpointArn: token.aws_sns_endpoint_arn,
      topicArn: appTopicMap[token.app_name],
      protocol: 'application',
    };
  });

  const limiter = new RateLimiter(1, 1000);

  let ix = 0;

  Promise.all(
    topics.map(topic => {
      return new Promise(accept => {
        limiter.removeTokens(1, function() {
          console.log(ix++, '/', topics.length);
          subscribe(topic).then(accept);
        });
      });
    })
  ).then(() => {
    console.log('Process Complete. Have a nice day');
    db.destroy();
    // eslint-disable-next-line
    process.exit();
  });
}

async function subscribe(item) {
  console.log('Subscribing =>', item);
  /*
  return pushlib
    .subscribeEndpointToTopic(item.endpointArn, item.topicArn, item.protocol)
    .then(() => true)
    .catch(() => false);
   */
  return true;
}

function getAllTokens(db) {
  return db('push_device_tokens');
}

run(db);
