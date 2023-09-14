// eslint-disable-next-line no-unused-vars
const { env } = require('../../config');
// eslint-disable-next-line no-unused-vars

function sendLogEventSync(eventObject, eventType = 'default_type', serviceName = `district-server-${env}`) {
  try {
    console.info(JSON.stringify({
      ...eventObject,
      timestamp: new Date(),
      serviceName,
      eventType,
    }));
  } catch (ex) {
    console.error(`sendLogEvent > exception >`, ex);
  }
}

async function sendLogEvent(eventObject, eventType = 'default_type', serviceName = `district-server-${env}`) {
  try {
    console.info(JSON.stringify({
      ...eventObject,
      timestamp: new Date(),
      serviceName,
      eventType,
    }));
  } catch (ex) {
    console.error(`sendLogEvent > exception >`, ex);
  }
}

const kinesisEventTypes = {
  testRouteEvent: 'testRoute',
  myFatoorahPaymentCallbackEvent: 'paymentCb-myFatoorah',
  myFatoorahWebhookSuccessEvent: 'payment-Wh-myFatoorah-success',
  myFatoorahWebhookIncompleteBodyEvent:
    'payment-Wh-myFatoorah-fail-incomplete-body',
  myFatoorahWebhookFailEvent: 'payment-Wh-myFatoorah-fail',
  myFatoorahWebhookRefundEvent: 'payment-Wh-myFatoorah-refund',
  fraudDetection: 'fraudDetection',
  checkoutComPaymentCallbackEvent: 'paymentCb-checkoutCom',
  checkoutComPaymentWebhookTriggeredEvent: 'payment-Wh-checkoutCom-triggered',
  checkoutComPaymentWebhookIncompleteBody: 'payment-Wh-checkoutCom-incomplete',
  checkoutComPaymentWebhookSuccess: 'payment-Wh-checkoutCom-success',
  checkoutComPaymentWebhookFail: 'payment-Wh-checkoutCom-fail',
  customerPasswordRequested: 'customerPasswordRequested',
  customerAccountDeletionRequest: 'customerAccountDeletionRequest',
  mobilExpressPaymentCallbackEvent: 'paymentCb-mobilExpress',
  orderCreateBegin: 'order-create-begin',
  orderCreateSuccess: 'order-create-success',
  orderCreateError: 'order-create-error',
  orderValidateError: 'order-validate-error',
  orderStatusChange: 'order-status-change',
  orderStatusChangeSameStatus: 'order-status-change-same-status',
  orderStatusChangeSaved: 'order-status-change-saved',
  loyaltyOrderCreateSuccess: 'loyalty-order-create-success',
  loyaltyOrderCreateError: 'loyalty-order-create-error',
  loyaltyOrderNotificationFailed: 'loyalty-order-notification-failed',
  storeOrderCreateSuccess: 'store-order-create-success',
  storeOrderCreateError: 'store-order-create-error',
  storeOrderStatusError: 'store-order-status-error',
  giftCardOrderCreateSuccess: 'gift-card-order-create-success',
  giftCardOrderCreateFail: 'gift-card-order-create-fail',
  redeemCouponSuccess: 'redeem-coupon-success',
  redeemCouponError: 'redeem-coupon-error',
  checkoutVerifyCardResponse: 'checkout-verifyCardResponse',
  checkoutCardSourceError: 'checkout-cardSourceError',
  checkoutCardSaveFail: 'checkout-cardSaveFail',
  checkoutCardSaveWebhook: 'checkoutCardSaveWebhook',
  checkoutCardSaveCallbackSuccess: 'checkout-cardSave-Success',
  checkoutCardSaveCallbackFail: 'checkout-cardSave-Fail',
  checkoutCardCustomerError: 'checkout-cardCustomerError',
  autoActivateDeliverySQSError: 'auto-activate-delivery-sqs-error',
  zendeskTicketCreate: 'zendesk-ticketCreate',
  zendeskTicketError: 'zendesk-ticketError',
  customerTierDown: 'customerTier-Down',
  graphqlRequestResponse: 'graphqlRequestResponse',
  walletSaveDebit: 'wallet-save-debit',
  walletSaveGetAccounts: 'wallet-save-get-accounts',
  walletSaveCreateAccountsFromTransactions:
    'wallet-save-create-accounts-from-transactions',
  walletSaveCredit: 'wallet-save-credit',
  authCustomerSaveError: 'authCustomerSave-error',
  otpError: 'otpError',
  subscriptionUsageError: 'subscription-usage-error',
  finishCustomerSubscription: 'finish-customer-subscription',
  finishCustomerSubscriptionError: 'finish-customer-subscription-error',
  subscriptionFinishReminderError: 'subscription-finish-reminder-error',
  slackMessageError: 'slack-message-error',
  tasleehMaintenanceError: 'tasleeh-maintenance-error'
};

module.exports = {
  sendLogEvent,
  kinesisEventTypes,
  sendLogEventSync,
};
