const {
  NotificationInfoTableName,
  NotificationProvider,
  NotificationStatus,
} = require('../definitions');
const {
  sendPushNotificationFirebase,
} = require('../providers/firebase-cloud-messaging/index');
const {
  sendPushNotificationOneSignal,
} = require('../providers/one-signal/one-signal-push-provider');
const { updateNotificationStatusDb } = require('../helpers/notification-status-helper');

module.exports = {
  handlePushNotification: async function handlePushNotification(queryContext, message) {
    let isSent;
    switch (message.provider) {
      case NotificationProvider.ONE_SIGNAL: {
        isSent = await sendPushNotificationOneSignal(queryContext, message.content);
        break;
      }
      case NotificationProvider.FIREBASE_CLOUD_MESSAGING: {
        isSent = await sendPushNotificationFirebase(queryContext, message.content);
        break;
      }
      default: {
        throw new Error(
          'Unknown Push Notification Handler : ' + message.provider
        );
      }
    }
    const updatedStatus = isSent
      ? NotificationStatus.DELIVERED
      : NotificationStatus.FAILED;
    await updateNotificationStatusDb(
      queryContext,
      NotificationInfoTableName.NOTIFICATIONS,
      message.content.id,
      updatedStatus
    );
  }
}
