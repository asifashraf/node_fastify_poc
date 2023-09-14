// eslint-disable-next-line no-unused-vars
const { Kinesis } = require('aws-sdk');
// eslint-disable-next-line no-unused-vars
const { isProd, env } = require('../../config');
// eslint-disable-next-line no-unused-vars
const instanceMetadataUtil = require('./aws-instance-metadata-util');

// CONSTANTS
const STREAM_NAME = 'centralized-event-log-stream';
const DEFAULT_PARTITION_ID = 'default-partition-id';
const SERVICE_NAME = `district-server-${env}`;
const SERVICE_NAME_ADMIN = `admin-district-server-${env}`;
const FALLBACK_EVENT_TYPE = 'default_type';
const REGION_NAME = 'eu-west-1';

let kinesisClient = null;

function getKinesisClient() {
  if (kinesisClient === null) {
    kinesisClient = new Kinesis({
      apiVersion: '2013-12-02',
      region: REGION_NAME,
    });
  }
  return kinesisClient;
}

async function sendLogEvent(eventObject, eventType = FALLBACK_EVENT_TYPE, serviceName = SERVICE_NAME) {
  const record = {
    Data: JSON.stringify({
      ...eventObject,
      timestamp: new Date(),
      serviceName,
      eventType,
    }),
    PartitionKey: DEFAULT_PARTITION_ID,
    StreamName: STREAM_NAME,
  };
  try {
    const kinesisClient = getKinesisClient();
    await kinesisClient.putRecord(record).promise();
  } catch (err) {
    console.log('Error at Kinesis Logging : ', err, 'Record:', record);
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
  mobilExpressPaymentWebhookEvent: 'paymentWh-mobilExpress',
  mobilExpressPaymentWebhookInvalidParameters:
    'paymentWh-mobilExpress-invalid-parameters',
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
  eInvoiceRequestSuccess: 'eInvoice-request-success',
  eInvoiceRequestError: 'eInvoice-request-error',
  otpError: 'otpError',
  subscriptionUsageError: 'subscription-usage-error',
  finishCustomerSubscription: 'finish-customer-subscription',
  finishCustomerSubscriptionError: 'finish-customer-subscription-error',
  subscriptionFinishReminderError: 'subscription-finish-reminder-error',
  slackMessageError: 'slack-message-error',
  tasleehMaintenanceError: 'tasleeh-maintenance-error',
  cofePaymentErrorParseError: 'cofe-payment-error-parse-error',
};

async function sendAdminLogEvent(eventObject, eventType = FALLBACK_EVENT_TYPE) {
  const record = {
    Data: JSON.stringify({
      ...eventObject,
      timestamp: new Date(),
      serviceName: SERVICE_NAME_ADMIN,
      eventType,
    }),
    PartitionKey: DEFAULT_PARTITION_ID,
    StreamName: STREAM_NAME,
  };
  try {
    const kinesisClient = getKinesisClient();
    await kinesisClient.putRecord(record).promise();
  } catch (err) {
    console.log('Error at Kinesis Logging : ', err, 'Record:', record);
  }
}

const kinesisAdminEventTypes = {
  loginAdminEvent: 'loginAdmin',
  logoutAdminEvent: 'logoutAdmin',
  brandUpdateAdminEvent: 'brandUpdateAdminEvent',
  brandCreateAdminEvent: 'brandCreateAdminEvent',
  brandLocationUpdateAdminEvent: 'brandUpdateAdminEvent',
  brandLocationCreateAdminEvent: 'brandCreateAdminEvent',
  brandLocationWeeklyScheduleUpdateAdminEvent: 'brandLocationWeeklyScheduleUpdateAdminEvent',
  brandLocationScheduleExceptionsSaveAdminEvent: 'brandLocationScheduleExceptionsSaveAdminEvent',
  brandLocationFacilitySaveAdminEvent: 'brandLocationFacilitySaveAdminEvent',
  rewardSaveAdminEvent: 'rewardSaveAdminEvent',
  couponSaveAdminEvent: 'couponSaveAdminEvent',
  productSaveAdminEvent: 'productSaveAdminEvent',
  orderStatusChangeAdminEvent: 'orderStatusChangeAdmin',
  orderRejectAdminEvent: 'orderRejectAdminEvent',
  orderRefundAdminEvent: 'orderRefundAdminEvent',
  customerWalletUpdateAdminEvent: 'customerWalletUpdateAdmin',
  ordersReportDownloadAdminEvent: 'ordersReportDownloadAdmin',
};

module.exports = {
  getKinesisClient,
  sendLogEvent,
  sendAdminLogEvent,
  kinesisEventTypes,
  kinesisAdminEventTypes
};
