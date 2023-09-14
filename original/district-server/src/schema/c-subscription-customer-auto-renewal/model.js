/* eslint-disable camelcase */
const BaseModel = require('../../base-model');
const { cSubscriptionStatus } = require('../c-subscription/enum');
const { countryConfigurationKeys, orderSetSource, paymentStatusName } = require('../root/enums');
const { cSubscriptionCustomerAutoRenewalStatus,
  cSubscriptionCustomerAutoRenewalValidationErrors,
  cSubscriptionCustomerAutoRenewalErrors,
} = require('./enum');
const moment = require('moment');
const {
  contentTemplates, replacePlaceholders,
} = require('../../lib/push-notification');
const { notificationCategories } = require('../../lib/notifications');
const {
  cSubscriptionCustomerAutoRenewalStatusActionType,
  cSubscriptionCustomerAutoRenewalStatusActionSrc,
} = require('../c-subscription-customer-auto-renewal-status/enum');
const SlackWebHookManager = require('../slack-webhook-manager/slack-webhook-manager');
const {
  SubscriptionAutoRenewalValidationError,
  SubscriptionAutoRenewalError,
} = require('./errors');
const { paymentSchemes } = require('../../payment-service/enums');
const subscriptionWebhookUrl = require('../../../config').cSubscription.slackWebHook;

class CSubscriptionCustomerAutoRenewal extends BaseModel {
  constructor(db, context) {
    super(db, 'subscription_customer_auto_renewals', context);
  }

  async isAutoRenewalActiveForSubscription(cSubscription) {
    if (cSubscription?.status !== cSubscriptionStatus.ACTIVE) {
      return false;
    }

    const isEnabledInCountry = await this.context.countryConfiguration
      .getByKey(
        countryConfigurationKeys.SUBSCRIPTION_AUTO_RENEWAL_ENABLED,
        cSubscription.countryId
      ).then(configuration => configuration?.configurationValue === 'true');
    if (!isEnabledInCountry) {
      return false;
    }

    return this.context.cSubscription
      .isSubscriptionEnableByCountryId(cSubscription.countryId);
  }

  async getAutoRenewalStatusBySubscriptionId(subscriptionId) {
    const cSubscription = await this.context.cSubscription.getById(
      subscriptionId
    );
    const isActive = await this.isAutoRenewalActiveForSubscription(
      cSubscription
    );
    const defaultValue = await this.context.countryConfiguration
      .getByKey(
        countryConfigurationKeys.SUBSCRIPTION_AUTO_RENEWAL_DEFAULT_VALUE,
        cSubscription.countryId
      ).then(configuration => configuration?.configurationValue === 'true');
    return {
      isShow: isActive,
      autoRenewalDate: moment()
        .add(cSubscription.periodInMinutes, 'minutes'),
      defaultValue,
    };
  }

  getById(id) {
    return this.db(this.tableName)
      .where('id', id)
      .first();
  }

  async getAutoRenewalStatusForSubscriptionCustomer(
    subscriptionCustomerOverview,
  ) {
    const {
      subscriptionCustomerAutoRenewalId,
      expiryDate,
    } = subscriptionCustomerOverview;

    if (!subscriptionCustomerAutoRenewalId) {
      return { isActive: false };
    }
    const autoRenewal = await this.getById(subscriptionCustomerAutoRenewalId);

    if (
      autoRenewal.status !== cSubscriptionCustomerAutoRenewalStatus.ACTIVE
    ) {
      return { isActive: false };
    }

    const customerCardToken = await this.context.customerCardToken.getById(
      autoRenewal.paymentInformation.customerCardTokenId
    );

    return {
      isActive: true,
      autoRenewalDate: expiryDate,
      paymentInfo: {
        imageUrl: this.context.paymentService.icons.SAVED_CARD,
        infoText: `**** ${customerCardToken.last4}`
      }
    };
  }

  cancelAutoRenewal(subscriptionCustomerAutoRenewalId, actionSrc) {
    return Promise.all([
      this.save({
        id: subscriptionCustomerAutoRenewalId,
        status: cSubscriptionCustomerAutoRenewalStatus.CANCELED,
      }),
      this.context.cSubscriptionCustomerAutoRenewalStatus.cancelAutoRenewal(
        subscriptionCustomerAutoRenewalId,
        actionSrc
      ),
    ]);
  }

  async autoRenewalReminderNotification(subscriptionCustomer) {
    let message = contentTemplates().contents.subscriptionAutoRenewalReminder;
    const heading = contentTemplates().headings.subscriptionAutoRenewalReminder;

    const subscription = await this.context.cSubscription.getById(
      subscriptionCustomer.subscriptionId
    );
    const brand = await this.context.brand.getById(
      subscriptionCustomer.brandId
    );
    const brandName = {
      en: brand?.name?.en || brand?.name || '',
      ar: brand?.nameAr || brand?.name?.ar || brand?.name || '',
      tr: brand?.nameTr || brand?.name?.tr || brand?.name || '',
    };
    message = replacePlaceholders(message, {
      planName: subscription.name.en,
      planNameAr: subscription.name.ar,
      planNameTr: subscription.name.en,
      brandName: brandName.en,
      brandNameAr: brandName.ar,
      brandNameTr: brandName.tr,
    });

    return {
      push: [
        {
          customerId: subscriptionCustomer.customerId,
          message,
          heading,
          notificationCategory:
            notificationCategories.SUBSCRIPTION_AUTO_RENEWAL_REMINDER,
          subscriptionCustomerId: subscriptionCustomer.id,
          subscriptionId: subscriptionCustomer.subscriptionId,
        },
      ],
      email: []
    };
  }

  async autoRenewalPurchaseSuccessNotification(subscriptionCustomer) {
    let message = contentTemplates()
      .contents
      .subscriptionAutoRenewalPurchaseSuccess;
    const heading = contentTemplates()
      .headings
      .subscriptionAutoRenewalPurchaseSuccess;

    const subscription = await this.context.cSubscription.getById(
      subscriptionCustomer.subscriptionId
    );
    const brand = await this.context.brand.getById(
      subscriptionCustomer.brandId
    );
    const brandName = {
      en: brand?.name?.en || brand?.name || '',
      ar: brand?.nameAr || brand?.name?.ar || brand?.name || '',
      tr: brand?.nameTr || brand?.name?.tr || brand?.name || '',
    };
    message = replacePlaceholders(message, {
      planName: subscription.name.en,
      planNameAr: subscription.name.ar,
      planNameTr: subscription.name.en,
      brandName: brandName.en,
      brandNameAr: brandName.ar,
      brandNameTr: brandName.tr,
    });

    return {
      push: [
        {
          customerId: subscriptionCustomer.customerId,
          message,
          heading,
          notificationCategory:
            notificationCategories.SUBSCRIPTION_AUTO_RENEWAL_PURCHASE_SUCCESS,
          subscriptionCustomerId: subscriptionCustomer.id,
          subscriptionId: subscriptionCustomer.subscriptionId,
        },
      ],
      email: []
    };
  }

  async autoRenewalPurchaseFailureNotification(subscriptionCustomer) {
    let message = contentTemplates()
      .contents
      .subscriptionAutoRenewalPurchaseFailure;
    const heading = contentTemplates()
      .headings
      .subscriptionAutoRenewalPurchaseFailure;

    const subscription = await this.context.cSubscription.getById(
      subscriptionCustomer.subscriptionId
    );
    const brand = await this.context.brand.getById(
      subscriptionCustomer.brandId
    );
    const brandName = {
      en: brand?.name?.en || brand?.name || '',
      ar: brand?.nameAr || brand?.name?.ar || brand?.name || '',
      tr: brand?.nameTr || brand?.name?.tr || brand?.name || '',
    };
    message = replacePlaceholders(message, {
      planName: subscription.name.en,
      planNameAr: subscription.name.ar,
      planNameTr: subscription.name.en,
      brandName: brandName.en,
      brandNameAr: brandName.ar,
      brandNameTr: brandName.tr,
    });

    return {
      push: [
        {
          customerId: subscriptionCustomer.customerId,
          message,
          heading,
          notificationCategory:
            notificationCategories.SUBSCRIPTION_AUTO_RENEWAL_PURCHASE_FAILURE,
          subscriptionCustomerId: subscriptionCustomer.id,
          subscriptionId: subscriptionCustomer.subscriptionId,
        },
      ],
      email: []
    };
  }

  async createOrUpdateAutoRenewal(
    {
      customerId,
      subscriptionId,
      paymentProvider,
      rawPaymentResponse,
      countryCode,
    }
  ) {
    const autoRenewalData = await this.context.paymentService
      .getSubscriptionAutoRenewalData(
        paymentProvider,
        rawPaymentResponse,
        countryCode
      );
    let subscriptionCustomerAutoRenewalId =
      autoRenewalData?.subscriptionCustomerAutoRenewalId;
    if (!subscriptionCustomerAutoRenewalId) {
      subscriptionCustomerAutoRenewalId = await this.save({
        customerId,
        subscriptionId,
        status: autoRenewalData
          ? cSubscriptionCustomerAutoRenewalStatus.ACTIVE
          : cSubscriptionCustomerAutoRenewalStatus.INACTIVE,
        paymentProvider,
        paymentInformation: autoRenewalData && {
          customerCardTokenId: autoRenewalData.customerCardTokenId,
        }
      });
    }
    if (autoRenewalData) {
      await this.context.cSubscriptionCustomerAutoRenewalStatus.save({
        subscriptionsAutoRenewalId: subscriptionCustomerAutoRenewalId,
        actionSrc: autoRenewalData.initialOrder
          ? cSubscriptionCustomerAutoRenewalStatusActionSrc.CUSTOMER
          : cSubscriptionCustomerAutoRenewalStatusActionSrc.SYSTEM,
        actionType: cSubscriptionCustomerAutoRenewalStatusActionType.PAYMENT,
        actionResult: autoRenewalData.paymentStatus,
        actionResultDetail: autoRenewalData,
      });
    }
    const allActiveAutoRenewals =
      await this.getAllActiveAutoRenewalsForCustomer(customerId);
    this.sendItToSqs(
      'analytics',
      {
        analyticsProvider: 'BRAZE',
        data: {
          attributes: [
            {
              'external_id': customerId,
              'subscription_autorenewal': allActiveAutoRenewals.length > 0,
            }
          ]
        }
      }
    ).catch(err => console.error(err));
    return subscriptionCustomerAutoRenewalId;
  }

  getAllActiveAutoRenewalsForCustomer(customerId) {
    return this.roDb(this.tableName)
      .where('customer_id', customerId)
      .andWhere('status', cSubscriptionCustomerAutoRenewalStatus.ACTIVE);
  }

  async validateAutoRenewal(
    { subscriptionCustomerAutoRenewal, subscriptionCustomerId }
  ) {
    if (
      subscriptionCustomerAutoRenewal.status
      !== cSubscriptionCustomerAutoRenewalStatus.ACTIVE
    ) {
      throw new SubscriptionAutoRenewalValidationError(
        cSubscriptionCustomerAutoRenewalValidationErrors.AUTO_RENEWAL_IS_NOT_ACTIVE
      );
    }

    const activeSubscriptionCustomers = await this.context
      .cSubscriptionCustomer
      .getAllActiveBySubscriptionCustomerAutoRenewalId(
        subscriptionCustomerAutoRenewal.id
      );
    if (activeSubscriptionCustomers.length > 0) {
      throw new SubscriptionAutoRenewalValidationError(
        cSubscriptionCustomerAutoRenewalValidationErrors.ALREADY_RENEWED
      );
    }

    return true;
  }
  async renewSubscriptionCustomer(subscriptionCustomerId) {
    const subscriptionCustomer = await this.context.cSubscriptionCustomer.getById(
      subscriptionCustomerId
    );
    const autoRenewal = await this.getById(
      subscriptionCustomer.subscriptionCustomerAutoRenewalId
    );
    try {
      await this.validateAutoRenewal({
        subscriptionCustomerId,
        subscriptionCustomerAutoRenewal: autoRenewal,
      });

      const latestAutoRenewalPaymentStatus = await this.context
        .cSubscriptionCustomerAutoRenewalStatus
        .getLatestPaymentStatusByAutoRenewalId(autoRenewal.id);

      const orderInput = {
        item: {
          subscriptionId: autoRenewal.subscriptionId
        },
        customerId: autoRenewal.customerId,
        useCredits: false,
        autoRenewal: true,
        paymentMethod: {
          paymentScheme: paymentSchemes.SAVED_CARD,
          sourceId: autoRenewal.paymentInformation.customerCardTokenId,
        },
        src: orderSetSource.AUTO_RENEWAL,
        srcPlatform: null,
        srcPlatformVersion: null,
        initialOrder: false,
        subscriptionCustomerAutoRenewalId: autoRenewal.id,
        previousPaymentId:
          latestAutoRenewalPaymentStatus.actionResultDetail.paymentId,
      };
      const result = await this.context.cSubscriptionOrder.create(orderInput);
      switch (result.paymentStatus) {
        case paymentStatusName.PAYMENT_SUCCESS:
          await this.context.cSubscriptionOrder.paymentSuccess(
            orderInput,
            result
          );
          break;
        case paymentStatusName.PAYMENT_FAILURE:
          await this.context.cSubscriptionOrder.paymentFailed(
            orderInput,
            result
          );
          this.context.kinesisLogger.sendLogEvent(
            {
              autoRenewal,
              result,
            },
            'renew-subscription-customer-payment-failed'
          ).catch(err => console.error(err));
          await this.context.cSubscriptionCustomerAutoRenewalStatus.save({
            subscriptionsAutoRenewalId: autoRenewal.id,
            actionSrc: cSubscriptionCustomerAutoRenewalStatusActionSrc.SYSTEM,
            actionType:
              cSubscriptionCustomerAutoRenewalStatusActionType.PAYMENT,
            actionResult: result.paymentStatus,
            actionResultDetail: result.rawPaymentResponse,
          });
          throw new SubscriptionAutoRenewalError(
            cSubscriptionCustomerAutoRenewalErrors.PAYMENT_FAILURE
          );
        default:
          this.context.kinesisLogger.sendLogEvent(
            {
              autoRenewal,
              result,
            },
            'renew-subscription-customer-unspecified-error'
          ).catch(err => console.error(err));
          throw new SubscriptionAutoRenewalError(
            cSubscriptionCustomerAutoRenewalErrors.UNSPECIFIED_ERROR
          );
      }
      const subscriptionCustomer = await this.context.cSubscriptionCustomer
        .getByCustomerIdAndSubscriptionId(
          autoRenewal.customerId,
          autoRenewal.subscriptionId
        );
      return { status: true, subscriptionCustomer };
    } catch (err) {
      let sendSlackMessage = true;
      let errorText = '[ERROR] an error occurred while processing auto renewal';
      if (err instanceof SubscriptionAutoRenewalValidationError) {
        if (
          err.message === cSubscriptionCustomerAutoRenewalValidationErrors.AUTO_RENEWAL_IS_NOT_ACTIVE
        ) {
          return {
            status: false,
            error: err.message,
          };
        } else if (err.message === cSubscriptionCustomerAutoRenewalValidationErrors.ALREADY_RENEWED) {
          errorText = '[ERROR] Tried auto renew for already renewed subscription';
        }
      }
      if (err instanceof SubscriptionAutoRenewalError) {
        if (
          err.message === cSubscriptionCustomerAutoRenewalErrors.PAYMENT_FAILURE
        ) {
          sendSlackMessage = false;
        }
      }
      if (sendSlackMessage) {
        SlackWebHookManager.sendTextAndObjectToSlack(
          errorText,
          {
            subscriptionCustomerId,
            subscriptionCustomerAutoRenewalId: autoRenewal.id,
            error: err?.message || err,
          },
          subscriptionWebhookUrl
        ).catch(err => console.error(err));
      }
      await this.cancelAutoRenewal(
        autoRenewal.id,
        cSubscriptionCustomerAutoRenewalStatusActionSrc.SYSTEM
      );
      await this.context.cSubscriptionCustomer.sendNotification(
        subscriptionCustomerId,
        notificationCategories.SUBSCRIPTION_AUTO_RENEWAL_PURCHASE_FAILURE
      );
      return {
        status: false,
        error: err?.message
          || cSubscriptionCustomerAutoRenewalErrors.SERVICE_ERROR
      };
    }
  }
}


module.exports = CSubscriptionCustomerAutoRenewal;
