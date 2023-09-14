const sqs = require('./../../lib/sqs-base')('analytics');
const Axios = require('axios');
const { brazeConfig } = require('../../../config');
const axios = Axios.create({
  baseURL: brazeConfig.brazeServiceURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${brazeConfig.brazeApiKey}`
  }
});
const AnalyticsProviders = {
  BRAZE: 'BRAZE',
};

module.exports = function SendAnalyticsEvent(queryContext) {
  const sqsConsumer = async ({ sqsMessage }) => {
    try {
      if (!sqsMessage) {
        console.log("SQS message is empty.");
        return;
      }
      if (!sqsMessage.Records) {
        console.log("SQSMessage.records is empty: ", sqsMessage);
        return;
      }
      for (const record of sqsMessage.Records) {
        const { body } = record;
        const messageBody = JSON.parse(body);
        if (!messageBody) {
          console.log("SQSMessage body is empty.");
          return;
        }
        switch (messageBody.analyticsProvider) {
          case AnalyticsProviders.BRAZE:
              return await sendEvent(messageBody.data);
          default:
              console.log("Unrecognized or unprocessed analytics provider", eventProvider);
        }
      }
    } catch (ex) {
      const { stack, message } = ex || {};
      queryContext.kinesisLogger.sendLogEvent(
        { stack, message },
        "send-analytics-event-consumer-exception"
      );
    }
  };
  sqs.consume({ callback: sqsConsumer });
};

async function sendEvent(data) {
  try {
      await axios.post("users/track", data)
  } catch (err) {
      console.log("err", err)
      return false;
  }
  return true;
}