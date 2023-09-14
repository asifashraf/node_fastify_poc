const { notificationCategories } = require('../../notifications/enums');

/*
* these types are being processed by mobile app
* if you want to change them you have to discuss
* with mobile developers
* */
const FCMNotificationCategories = {
  GIFT_CARD: 'GIFT_CARD',
  ORDER: 'ORDER',
  STORE_ORDER: 'STORE_ORDER',
  REFERRAL: 'REFERRAL',
  ORDER_CUSTOMER_ARRIVAL: 'ORDER_CUSTOMER_ARRIVAL',
  SUBSCRIPTION: 'SUBSCRIPTION',
  SUBSCRIPTION_FINISH_REMINDER: 'SUBSCRIPTION_FINISH_REMINDER',
  SUBSCRIPTION_PURCHASE: 'SUBSCRIPTION_PURCHASE',
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
  SUBSCRIPTION_AUTO_RENEWAL_PURCHASE_SUCCESS:
    'SUBSCRIPTION_AUTO_RENEWAL_PURCHASE_SUCCESS',
  SUBSCRIPTION_AUTO_RENEWAL_PURCHASE_FAILURE:
    'SUBSCRIPTION_AUTO_RENEWAL_PURCHASE_FAILURE',
  MARKETPLACE_ORDER_DETAIL: 'MARKETPLACE_ORDER_DETAIL',
  BRANCH: 'BRANCH',
};

const getCategorySpecificData = (
  {
    notificationCategory,
    url,
    storeOrderId,
    orderSetId,
    subscriptionCustomerId,
    subscriptionId,
    brandId,
    deeplink
  },
) => {
  switch (notificationCategory) {
    case notificationCategories.PICKUP_UPDATE:
    case notificationCategories.DELIVERY_UPDATE:
    case notificationCategories.EXPRESS_DELIVERY_UPDATE:
      return {
        category: FCMNotificationCategories.ORDER,
        orderSetId
      };
    case notificationCategories.GIFT_CARD_ORDER:
      return {
        category: FCMNotificationCategories.GIFT_CARD,
        url,
      };
    case notificationCategories.REFERRAL_ACTIVATED:
      return {
        category: FCMNotificationCategories.REFERRAL,
      };
    case notificationCategories.STORE_ORDER_UPDATE:
      return {
        category: FCMNotificationCategories.STORE_ORDER,
        storeOrderId,
      };
    case notificationCategories.ORDER_CUSTOMER_ARRIVAL:
      return {
        category: FCMNotificationCategories.ORDER_CUSTOMER_ARRIVAL,
        orderSetId,
      };
    case notificationCategories.SUBSCRIPTION_LOW_CUP_COUNTS_REMINDER:
      return {
        category: FCMNotificationCategories.SUBSCRIPTION_LOW_CUP_COUNTS_REMINDER,
        subscriptionCustomerId,
        subscriptionId
      };
    case notificationCategories.SUBSCRIPTION_ALL_CUPS_CONSUMED_FAST_REMINDER:
      return {
        category: FCMNotificationCategories.SUBSCRIPTION_ALL_CUPS_CONSUMED_FAST_REMINDER,
        subscriptionCustomerId,
        subscriptionId
      };
    case notificationCategories.SUBSCRIPTION_ALL_CUPS_CONSUMED_REMINDER:
      return {
        category: FCMNotificationCategories.SUBSCRIPTION_ALL_CUPS_CONSUMED_REMINDER,
        subscriptionCustomerId,
        subscriptionId
      };
    case notificationCategories.SUBSCRIPTION_EXPIRY_DATE_NEAR_REMINDER:
      return {
        category: FCMNotificationCategories.SUBSCRIPTION_EXPIRY_DATE_NEAR_REMINDER,
        subscriptionCustomerId,
        subscriptionId
      };
    case notificationCategories.SUBSCRIPTION_EXPIRED_TODAY_REMINDER:
      return {
        category: FCMNotificationCategories.SUBSCRIPTION_EXPIRED_TODAY_REMINDER,
        subscriptionCustomerId,
        subscriptionId,
        brandId,
      };
    case notificationCategories.SUBSCRIPTION_EXPIRED_3_DAYS_LATER_REMINDER:
      return {
        category: FCMNotificationCategories.SUBSCRIPTION_EXPIRED_3_DAYS_LATER_REMINDER,
        subscriptionCustomerId,
        subscriptionId,
        brandId,
      };
    case notificationCategories.SUBSCRIPTION_EXPIRED_7_DAYS_LATER_REMINDER:
      return {
        category: FCMNotificationCategories.SUBSCRIPTION_EXPIRED_7_DAYS_LATER_REMINDER,
        subscriptionCustomerId,
        subscriptionId,
        brandId,
      };
    case notificationCategories.SUBSCRIPTION_EXPIRED_15_DAYS_LATER_REMINDER:
      return {
        category: FCMNotificationCategories.SUBSCRIPTION_EXPIRED_15_DAYS_LATER_REMINDER,
        subscriptionCustomerId,
        subscriptionId,
        brandId,
      };
    case notificationCategories.SUBSCRIPTION_EXPIRED_30_DAYS_LATER_REMINDER:
      return {
        category: FCMNotificationCategories.SUBSCRIPTION_EXPIRED_30_DAYS_LATER_REMINDER,
        subscriptionCustomerId,
        subscriptionId,
        brandId,
      };
    case notificationCategories.SUBSCRIPTION_AUTO_RENEWAL_REMINDER:
      return {
        category: FCMNotificationCategories.SUBSCRIPTION_AUTO_RENEWAL_REMINDER,
        subscriptionCustomerId,
        subscriptionId
      };
    case notificationCategories.SUBSCRIPTION_PURCHASE:
      return {
        category: FCMNotificationCategories.SUBSCRIPTION_PURCHASE,
        subscriptionCustomerId,
        subscriptionId
      };
    case notificationCategories.SUBSCRIPTION_AUTO_RENEWAL_PURCHASE_SUCCESS:
      return {
        category: FCMNotificationCategories.SUBSCRIPTION_AUTO_RENEWAL_PURCHASE_SUCCESS,
        subscriptionCustomerId,
        subscriptionId
      };
    case notificationCategories.SUBSCRIPTION_AUTO_RENEWAL_PURCHASE_FAILURE:
      return {
        category: FCMNotificationCategories.SUBSCRIPTION_AUTO_RENEWAL_PURCHASE_FAILURE,
        subscriptionCustomerId,
        subscriptionId
      };
    case notificationCategories.MARKETPLACE_ORDER_DETAIL:
      return {
        category: FCMNotificationCategories.MARKETPLACE_ORDER_DETAIL,
        storeOrderId,
        url
      };
    case notificationCategories.BRANCH:
      return {
        category: FCMNotificationCategories.BRANCH,
        deeplink,
      };
    default:
      return {};
  }
};

async function generateFCMPushNotificationPayload(
  settings,
  context,
  { customerIds, ...data },
) {
  // for this case, we can add topic mechanism in future
  if (!customerIds) {
    return null;
  }
  const tokens = await context.firebaseCloudMessaging.getCustomersTokens(
    customerIds,
  ) || [];
  if (tokens.length === 0) return null;
  const preferredLanguage = (settings.preferredLanguage || 'EN').toLowerCase();
  const contents = data.contents || {};
  const headings = data.headings || {};
  return {
    id: data.id,
    messages: tokens.map(({ token }) => ({
      message: {
        notification: {
          title: headings[preferredLanguage],
          body: contents[preferredLanguage],
        },
        data: getCategorySpecificData(data),
        apns: {
          payload: {
            aps: {
              sound: 'default'
            }
          }
        },
        token,
      },
    })),
  };
}

async function generateFCMPushNotificationPayloadOnlyData(
  settings,
  context,
  { customerIds, ...data },
) {
  // for this case, we can add topic mechanism in future
  if (!customerIds) {
    return null;
  }
  const tokens = await context.firebaseCloudMessaging.getCustomersTokens(
    customerIds,
  ) || [];
  if (tokens.length === 0) return null;
  const preferredLanguage = (settings.preferredLanguage || 'EN').toLowerCase();
  const contents = data.contents || {};
  const headings = data.headings || {};
  const subDescription = data.subDescription || {};
  const categorySpecificData = getCategorySpecificData(data);
  return {
    id: data.id,
    messages: tokens.map(({ token }) => ({
      message: {
        data: {
          title: headings[preferredLanguage],
          description: contents[preferredLanguage],
          subDescription: subDescription[preferredLanguage],
          ...categorySpecificData
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title:  headings[preferredLanguage],
                body: contents[preferredLanguage],
              },
              ...categorySpecificData
            }
          }
        },
        token,
      },
    })),
  };
}

module.exports = {
  generateFCMPushNotificationPayload,
  generateFCMPushNotificationPayloadOnlyData,
};
