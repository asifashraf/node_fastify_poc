exports.notificationStatuses = {
  PENDING: 'pending',
  DELIVERED: 'delivered',
  FAILED: 'failed',
};

exports.notificationProviders = {
  AWS_SES: 'AWS_SES',
  ONE_SIGNAL: 'ONE_SIGNAL',
  FIREBASE_CLOUD_MESSAGING: 'FIREBASE_CLOUD_MESSAGING',
};

exports.notificationActions = {
  PARTNER_REQUEST: 'PARTNER_REQUEST',
  CONTACT_US: 'CONTACT_US',
  COFELYTICS_REQUEST_INFO: 'COFELYTICS_REQUEST_INFO',
  ACCOUNT_DELETION_REQUEST: 'ACCOUNT_DELETION_REQUEST',
  CUSTOMER_EMAIL_VERIFICATION: 'CUSTOMER_EMAIL_VERIFICATION',
};

exports.notificationMedia = {
  PUSH: 'PUSH',
  SMS: 'SMS',
  EMAIL: 'EMAIL',
};

// This list should grow over time. Any category that can be disabled
// by NotificationSettings must be included here in particular.
exports.notificationCategories = {
  EXPRESS_DELIVERY_UPDATE: 'EXPRESS_DELIVERY_UPDATE',
  DELIVERY_UPDATE: 'DELIVERY_UPDATE',
  PICKUP_UPDATE: 'PICKUP_UPDATE',
  NEW_OFFER: 'NEW_OFFER',
  ORDER_CONFIRMATION: 'ORDER_CONFIRMATION',
  GIFT_CARD_ORDER: 'GIFT_CARD_ORDER',
  REFERRAL_ACTIVATED: 'REFERRAL_ACTIVATED',
  STORE_ORDER_UPDATE: 'STORE_ORDER_UPDATE',
  TEST: 'TEST',
  ORDER_CUSTOMER_ARRIVAL: 'ORDER_CUSTOMER_ARRIVAL',
  SUBSCRIPTION_LOW_CUP_COUNTS_REMINDER:
    'SUBSCRIPTION_LOW_CUP_COUNTS_REMINDER',
  SUBSCRIPTION_ALL_CUPS_CONSUMED_FAST_REMINDER:
    'SUBSCRIPTION_ALL_CUPS_CONSUMED_FAST_REMINDER',
  SUBSCRIPTION_ALL_CUPS_CONSUMED_REMINDER:
    'SUBSCRIPTION_ALL_CUPS_CONSUMED_REMINDER',
  SUBSCRIPTION_EXPIRY_DATE_NEAR_REMINDER:
    'SUBSCRIPTION_EXPIRY_DATE_NEAR_REMINDER',
  SUBSCRIPTION_EXPIRED_TODAY_REMINDER: 'SUBSCRIPTION_EXPIRED_TODAY_REMINDER',
  SUBSCRIPTION_EXPIRED_3_DAYS_LATER_REMINDER:
    'SUBSCRIPTION_EXPIRED_3_DAYS_LATER_REMINDER',
  SUBSCRIPTION_EXPIRED_7_DAYS_LATER_REMINDER:
    'SUBSCRIPTION_EXPIRED_7_DAYS_LATER_REMINDER',
  SUBSCRIPTION_EXPIRED_15_DAYS_LATER_REMINDER:
    'SUBSCRIPTION_EXPIRED_15_DAYS_LATER_REMINDER',
  SUBSCRIPTION_EXPIRED_30_DAYS_LATER_REMINDER:
    'SUBSCRIPTION_EXPIRED_30_DAYS_LATER_REMINDER',
  SUBSCRIPTION_AUTO_RENEWAL_REMINDER: 'SUBSCRIPTION_AUTO_RENEWAL_REMINDER',
  SUBSCRIPTION_PURCHASE: 'SUBSCRIPTION_PURCHASE',
  SUBSCRIPTION_AUTO_RENEWAL_PURCHASE_SUCCESS:
    'SUBSCRIPTION_AUTO_RENEWAL_PURCHASE_SUCCESS',
  SUBSCRIPTION_AUTO_RENEWAL_PURCHASE_FAILURE:
    'SUBSCRIPTION_AUTO_RENEWAL_PURCHASE_FAILURE',
  MARKETPLACE_ORDER_DETAIL: 'MARKETPLACE_ORDER_DETAIL',
  BRANCH: 'BRANCH',
};

exports.notificationFulfillmentList = {
  PICKUP: 'PICKUP',
  DRIVE_THROUGH: 'DRIVE_THROUGH',
  DELIVERY: 'DELIVERY',
  EXPRESS_DELIVERY: 'EXPRESS_DELIVERY',
};