const NotificationType = {
  PUSH: 'PUSH',
  EMAIL: 'EMAIL',
};

const NotificationProvider = {
  AWS_SES: 'AWS_SES',
  ONE_SIGNAL: 'ONE_SIGNAL',
  FIREBASE_CLOUD_MESSAGING: 'FIREBASE_CLOUD_MESSAGING',
};

const EmailActions = {
  PARTNER_REQUEST: 'PARTNER_REQUEST',
  CONTACT_US: 'CONTACT_US',
  ACCOUNT_DELETION_REQUEST: 'ACCOUNT_DELETION_REQUEST',
  CUSTOMER_EMAIL_VERIFICATION: 'CUSTOMER_EMAIL_VERIFICATION',
};

const NotificationInfoTableName = {
  NOTIFICATIONS: 'notifications',
  CONTACT_US: 'contact_us',
  PARTNER_REQUEST: 'partner_requests',
};

const NotificationStatus = {
  PENDING: 'pending',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  UNKNOWN: 'unknown',
};

module.exports = {
  NotificationType,
  NotificationProvider,
  EmailActions,
  NotificationInfoTableName,
  NotificationStatus
}