const kinesisLogger = require('../aws-kinesis-logging');
const AWS = require('aws-sdk');
const { SNSTopics } = require('../../../config');
const { adjustDeviceTypeIdentifiers } = require('../../schema/root/enums');


exports.publishEvent = async (topicName, message, ctx) => {
  let logger = kinesisLogger;
  if (ctx) {
    logger = ctx.kinesisLogger;
    if (!message.customerId) {
      message.customerId = ctx.auth.id;
    }
    if (message.customerId) {
      const customerDefaultDevice = await ctx.deviceMetadata.getDefaultByCustomer(
        message.customerId,
      );
      if (customerDefaultDevice) {
        if (message) {
          if (customerDefaultDevice.deviceIdentifierType) {
            message.customerDeviceIdentifierType = adjustDeviceTypeIdentifiers[customerDefaultDevice.deviceIdentifierType];
          }
          if (customerDefaultDevice.deviceId) {
            message.customerDeviceId = customerDefaultDevice.deviceId;
          }
        }
      }
    }
  }
  const event = new AWS.SNS({
    region: 'eu-west-1'
  }).publish({
    TopicArn: SNSTopics[topicName],
    Message: JSON.stringify(message),
  }).promise();
  try {
    const data = await event;
    console.log(
      `[${topicName}] event published. Message ID is ${data.MessageId}`,
    );
    logger.sendLogEvent(
      { topicArn: SNSTopics[topicName], messageId: data.MessageId, message },
      'event-publisher',
    ).catch(e => console.log(e));
  } catch (err) {
    const {message, stack} = err;
    logger.sendLogEvent(
      {topicArn: SNSTopics[topicName], message, stack},
      'event-publisher-error',
    ).catch(e => console.log(e));
  }
};
