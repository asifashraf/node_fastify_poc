const kinesisLogger = require('../aws-kinesis-logging');
const AWS = require('aws-sdk');
const { SNSTopics, enableSnsEventPublisher } = require('../../../config');


exports.publishEvent = async (eventType, message) => {

  if (enableSnsEventPublisher) {
    const event = new AWS.SNS({
      region: 'eu-west-1'
    }).publish({
      TopicArn: SNSTopics[eventType],
      Message: JSON.stringify(message),
    }).promise();
    try {
      const data = await event;
      console.log(
        `[${eventType}] event published. Message ID is ${data.MessageId}`,
      );
    } catch (err) {
      kinesisLogger.sendLogEvent(
        { err },
        'event-publisher-error',
      ).catch(e => console.log(e));
    }
  } else {
    console.info(`SNS > publishEvent >`, { eventType, message });
  }
};
