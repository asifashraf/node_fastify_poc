const sqs = require('./../../lib/sqs-base')('notifications');
const { NotificationType } = require('../../lib/notification-consumers/definitions')
const {
  handlePushNotification,
} = require('../notification-consumers/handlers/push-notification-handler');
const {
  handleEmailNotification,
} = require('../notification-consumers/handlers/email-notification-handler');

module.exports = function NotificationConsumer(queryContext) {
  const sqsConsumer = async ({ payload }) => {
    queryContext.callbackWaitsForEmptyEventLoop = false;
    try {

      const { Body } = payload;

      const messageBody = JSON.parse(Body);

      await handleNotification(queryContext, messageBody);
    } catch (ex) {
      const { stack, message } = ex || {};
      queryContext.kinesisLogger.sendLogEvent(
        { stack, message },
        'notification-consumer-exception'
      );
    }
  };
  sqs.consume({ callback: sqsConsumer });
};

async function handleNotification(queryContext, message) {
  switch (message.type) {
    case NotificationType.PUSH: {
      await handlePushNotification(queryContext, message);
      break;
    }
    case NotificationType.EMAIL: {
      await handleEmailNotification(queryContext, message);
      break;
    }
    default: {
      console.error(`handleNotification > unknown notification type >`, { message });
    }
  }
}
