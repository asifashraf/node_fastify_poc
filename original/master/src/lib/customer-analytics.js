const { customerAnalyticsConfig } = require('../../config');
const { sqs } = require('./sqs');
const { isNullOrUndefined } = require('./util');
const { adjustDeviceTypeIdentifiers } = require('../schema/root/enums');

exports.sendCustomerAnalyticsEventToQueue = messageObject => {
  const ANALYTICS_QUEUE_URL = customerAnalyticsConfig.queueName;
  return sqs
    .sendMessage({
      QueueUrl: ANALYTICS_QUEUE_URL,
      MessageBody: JSON.stringify(messageObject),
      MessageAttributes: {
        contentType: {
          DataType: 'String',
          StringValue: 'application/json',
        },
      },
    })
    .promise();
};

const checkRequiredMessageParams = messageParams => {
  console.log('messageParams', messageParams);
  if (
    isNullOrUndefined(messageParams.customerId) ||
    messageParams.customerId === ''
  ) {
    throw new Error('Customer Id is missing from Analytics Event');
  }
  if (
    isNullOrUndefined(messageParams.deviceIdentifierType) ||
    messageParams.deviceIdentifierType === ''
  ) {
    throw new Error('Device Identifier Type is missing from Analytics Event');
  }
  if (
    isNullOrUndefined(messageParams.deviceId) ||
    messageParams.deviceId === ''
  ) {
    throw new Error('Device Id is missing from Analytics Event');
  }
  if (
    isNullOrUndefined(messageParams.eventType) ||
    messageParams.eventType === ''
  ) {
    throw new Error('Event Type is missing from Analytics Event');
  }
};

exports.createCustomerAnalyticsEvent = analyticsEvent => {
  checkRequiredMessageParams(analyticsEvent);
  /* eslint-disable camelcase */
  return {
    customer_id: analyticsEvent.customerId,
    device_id: analyticsEvent.deviceId,
    device_identifier_type: analyticsEvent.deviceIdentifierType,
    event_type: analyticsEvent.eventType,
    event_data: analyticsEvent.eventData,
    event_note: analyticsEvent.eventNote,
  };
};

exports.sendCustomerEvent = (customerId, customerDefaultDevice, eventType, eventData = null, eventNote = null) => {
  try {
    if (!isNullOrUndefined(customerDefaultDevice)) {
      const eventPayload = {
        customerId,
        deviceIdentifierType:
          adjustDeviceTypeIdentifiers[
            customerDefaultDevice.deviceIdentifierType
          ],
        deviceId: customerDefaultDevice.deviceId,
        eventType,
        eventData,
        eventNote
      };
      const analyticsEvent = this.createCustomerAnalyticsEvent(eventPayload);
      this.sendCustomerAnalyticsEventToQueue(analyticsEvent).then(value => {
        console.log('sendCustomerEvent (is sent):', customerId, eventType);
      }).catch(err => {
        console.log('sendCustomerEvent (is not sent)(1):', customerId, eventType, 'Error:', err);
      });
    }
  } catch (err) {
    console.log('sendCustomerEvent (is not sent)(2):', eventType, 'Error:', err);
  }
};
