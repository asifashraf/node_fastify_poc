const kinesisLogger = require('./aws-kinesis-logging');
const SlackWebHookManager = require('../schema/slack-webhook-manager/slack-webhook-manager');
const sqs = require('./sqs-base');

async function alertIt({ text, object, image, path }) {
  try {
    return SlackWebHookManager.sendTextAndObjectAndImage({ text, object, image, webhookUrl: path });
  } catch (e) {
    console.log('alertIt-error', e);
  }
}

async function logIt({ eventType, eventObject, indexName }) {
  try {
    return kinesisLogger.sendLogEvent({data: eventObject}, eventType, indexName);
  } catch (e) {
    console.log('logIt-error', e);
  }
}

async function sendItToSqs(type, message, delay) {
  try {
    const sqsSpecific = sqs(type);
    return sqsSpecific.sendMessage(message, delay);
  } catch (e) {
    console.log('sendItToSqs-error', e);
  }

}


module.exports = {
  alertIt,
  logIt,
  sendItToSqs,
};
