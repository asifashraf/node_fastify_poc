/* eslint-disable camelcase */

const { first } = require('lodash');
const assert = require('assert');
const { uuid, transformToCamelCase } = require('./util');
const sqs = require('./sqs');
const {
  notifications: { enableNotifications, provider: pushNotificationProvider },
  isDev,
  isTest,
} = require('../../config');
const { generatePushNotificationPayload, generatePushNotificationPayloadWithOnlyData } = require('./push-notification');
const SlackWebHookManager = require('../schema/slack-webhook-manager/slack-webhook-manager');
const BaseModel = require('../base-model');
const { notificationProviders } = require('../notifications/enums');
const {
  notificationStatuses,
  notificationMedia,
  notificationCategories,
} = require('../notifications/enums');

if (!isTest) console.log('Notifications enabled:', enableNotifications);

const settingsPermitNotification = (settings, medium, category) => {
  switch (category) {
    case notificationCategories.DELIVERY_UPDATE:
    case notificationCategories.EXPRESS_DELIVERY_UPDATE:
      switch (medium) {
        // If customer not set allowSms comes true and
        // return true for this situation. Because,
        // allowSms and allowEmail feature came with
        // Turkey. Has been set true for existing user.
        case notificationMedia.SMS:
          return settings.allowSms && settings.smsDeliveryUpdates;
        case notificationMedia.EMAIL:
          return settings.allowEmail;
        case notificationMedia.PUSH:
          return settings.pushDeliveryUpdates;
        default:
          return true;
      }

    case notificationCategories.PICKUP_UPDATE:
      switch (medium) {
        // If customer not set allowEmail comes true and
        // return true for this situation. Because,
        // allowSms and allowEmail feature came with
        // Turkey. Has been set true for existing user.
        case notificationMedia.SMS:
          return settings.allowSms && settings.smsPickupUpdates;
        case notificationMedia.EMAIL:
          return settings.allowEmail;
        case notificationMedia.PUSH:
          return settings.pushPickupUpdates;
        default:
          return true;
      }

    case notificationCategories.NEW_OFFER:
      switch (medium) {
        case notificationMedia.SMS:
          return settings.newOffers && settings.allowSms;
        case notificationMedia.EMAIL:
          return settings.newOffers && settings.allowEmail;
        default:
          return settings.newOffers;
      }

    default:
      switch (medium) {
        // If customer not set allowEmail comes true and
        // return true for this situation. Because,
        // allowSms and allowEmail feature came with
        // Turkey. Has been set true for existing user.
        case notificationMedia.SMS:
          return settings.allowSms;
        case notificationMedia.EMAIL:
          return settings.allowEmail;
        default:
          return true;
      }
  }
};

class Notification extends BaseModel {
  constructor(db, context) {
    super(db, 'notifications', context);
  }

  async getNotificationSettingsByEmail(email) {
    const customer = await this.db('customers')
      .where('email', email)
      .then(first);
    // console.log(`fetched settings; ${JSON.stringify(customer)}`);
    return customer; // The settings are columns on the customer table now.
  }

  async getNotificationSettings(customerId) {
    const customer = await this.db('customers')
      .where('id', customerId)
      .then(first);
    // console.log(`fetched settings; ${JSON.stringify(customer)}`);
    return customer; // The settings are columns on the customer table now.
  }

  //------------------------------------------------------------------------------
  // PUSH
  //------------------------------------------------------------------------------

  /**
   Creates a mobile push notification in the notification queue. The notification will eventually be delivered by a worker in another process.

   Requires the following fields:
   @param {String} customerId - nullable if created for a marketing-notification
   @param {Object} message - If message is a string then only the message will be sent in a push notification
   to the recipient. If message is an object then it should have a fields `title` and `body` to
   include with the message.
   @param {Object} data - Any extra custom data to include with notification
   @param {String} notificationCategory - The category of the content of this notification. This is used to mute notifications on a customer-specific basis according to their notification settings.

   You may optionally include:
   @param {String} embargoDate - An ISO 8601 datetime string before which the notification must not be delivered.

   For testing purposes:
   @param {Date} dateCreated

   Returns a promise that resolves to the ID of the created notification.
   @return {Promise}
   */
  async pushCreate(args) {
    assert(args.message);
    assert(args.notificationCategory);

    if (!enableNotifications) {
      return;
    }

    let settings = null;

    if (args.customerId) {
      settings = await this.getNotificationSettings(args.customerId);
      const isPermitted = settingsPermitNotification(
        settings,
        notificationMedia.PUSH,
        args.notificationCategory
      );
      if (!isPermitted) {
        // console.log(`notification not permitted: ${args.notificationCategory}`);
        return;
      }
    }

    const id = uuid.get();
    const notification = {
      id,
      customer_id: args.customerId,
      date_created: args.dateCreated || new Date(),
      embargo_date: args.embargoDate,
      medium: notificationMedia.PUSH,
      status: notificationStatuses.PENDING,
    };
    await this.db.table('notifications').insert(notification);
    const { message, data } = args;
    const content = {
      id: uuid.get(),
      notification_id: id,
      apns:
        typeof message === 'string'
          ? { message: { body: message }, data }
          : { message, data },
    };
    await this.db.table('notification_content_push').insert(content);
    // await sqs.sendMessage({ type: notificationMedia.PUSH, id });
    let pushNotificationPayload;
    if (args.notificationCategory == notificationCategories.ORDER_CUSTOMER_ARRIVAL) {
      pushNotificationPayload = await generatePushNotificationPayloadWithOnlyData(
        pushNotificationProvider,
        settings,
        this.context,
        {
          id,
          headings: args.heading,
          contents: args.message,
          url: args.url,
          customerIds: args.customerId ? [args.customerId] : null,
          notificationCategory: args.notificationCategory,
          orderSetId: args.orderSetId,
          storeOrderId: args.storeOrderId,
          subDescription: args.subDescription ? args.subDescription : null,
        }
      );
    } else {
      pushNotificationPayload = await generatePushNotificationPayload(
        pushNotificationProvider,
        settings,
        this.context,
        {
          id,
          headings: args.heading,
          contents: args.message,
          url: args.url,
          customerIds: args.customerId ? [args.customerId] : null,
          notificationCategory: args.notificationCategory,
          orderSetId: args.orderSetId,
          storeOrderId: args.storeOrderId,
          subscriptionCustomerId: args.subscriptionCustomerId,
          subscriptionId: args.subscriptionId,
          brandId: args.brandId,
          subDescription: args.subDescription ? args.subDescription : null,
          deeplink: args.deeplink ? args.deeplink : null,
        }
      );
    }
    if (!pushNotificationPayload) {
      SlackWebHookManager.sendTextToSlack(
        `
          Notification was not sent!
          parameters -> ${JSON.stringify({...args, pushNotificationProvider})}
        `
      ).catch(err => console.log({
        place: 'src/lib/notifications.js:185',
        err: JSON.stringify(err)
      }));
      return id;
    }

    await sqs.sendMessage({
      type: notificationMedia.PUSH,
      provider: pushNotificationProvider,
      content: pushNotificationPayload,
    });

    return id;
  }

  //------------------------------------------------------------------------------
  // EMAIL
  //------------------------------------------------------------------------------

  /**
   Creates an email notification in the notification queue. The notification will eventually be delivered by a worker in another process.

   Requires the following fields:
   @param {String} customerId
   @param {String} sender - The sender's email.
   @param {String} subject - The subject of the email.
   @param {String} html - The html content of the email.
   @param {String} text - The plain text content of the email.
   @param {String} notificationCategory - The category of the content of this notification. This is used to mute notifications on a customer-specific basis according to their notification settings.

   You may optionally include:
   @param {String} embargoDate - An ISO 8601 datetime string before which the notification must not be delivered.

   For testing purposes:
   @param {Date} dateCreated

   Returns a promise that resolves to the ID of the created notification.
   @return {Promise}
   */
  async emailCreate(args) {
    if (args.customerId) {
      assert(args.customerId);
    } else {
      if (args.receiverEmail) {
        assert(args.receiverEmail);
      }
      if (args.receiverName) {
        assert(args.receiverName);
      }
    }
    assert(args.sender);
    assert(args.subject);
    assert(args.html);
    assert(args.text);
    assert(args.notificationCategory);
    if (!enableNotifications) {
      return;
    }
    if (args.customerId) {
      const settings = await this.getNotificationSettings(args.customerId);
      if (isDev && !isTest) {
        // In development mode, only send emails to @blackpixel addresses
        if (!settings.email.match(/@cofeapp\.com|@one\.xyz/)) {
          // return;
        }
      }
      // if email has not verified by user, do not send an email
      // to not suspend by mail server
      // due to sending emails to non existing email addresses
      if (!settings.isEmailVerified) return;
      const isPermitted = settingsPermitNotification(
        settings,
        notificationMedia.EMAIL,
        args.notificationCategory
      );

      if (!isPermitted) {
        // console.log(`notification not permitted: ${args.notificationCategory}`);
        return;
      }
    }

    const id = uuid.get();
    const notification = {
      id,
      customer_id: args.customerId ? args.customerId : null,
      date_created: args.dateCreated || new Date(),
      embargo_date: args.embargoDate,
      medium: notificationMedia.EMAIL,
      status: notificationStatuses.PENDING,
    };
    await this.db.table('notifications').insert(notification);
    const content = {
      id: uuid.get(),
      notification_id: id,
      receiver_email: args.receiverEmail ? args.receiverEmail : null,
      receiver_name: args.receiverName ? args.receiverName : null,
      sender: args.sender,
      subject: args.subject,
      html: args.html,
      text: args.text,
    };
    await this.db.table('notification_content_email').insert(content);
    const emailContent = first(
      transformToCamelCase(
        await this.db
          .table('notification_content_email')
          .where('id', content.id)
      )
    );
    // rename the field id to correct one
    emailContent.id = emailContent.notificationId;
    delete emailContent.notificationId;
    // as a fallback
    if (!emailContent.receiverEmail) {
      if (args.customerId) {
        const customer = await this.context.customer.getById(args.customerId);
        if (customer.email) {
          emailContent.receiverEmail = customer.email;
        }
      }
    }
    await this.sendNotificationContentToQueue(
      notificationMedia.EMAIL,
      notificationProviders.AWS_SES,
      emailContent
    );
    return id;
  }

  //------------------------------------------------------------------------------
  // CONVENIENCE
  //------------------------------------------------------------------------------

  /**
   Creates multiple notifications at once.

   @param {Date} notifications An object with three required fields: push, sms, and email, which are all to be arrays of objects. Each object should match the structure of the argument to the associated create method.

   Returns a promise that resolves to the IDs of the created notifications.
   @return {Promise}
   */
  createAllIn(notifications) {
    return Promise.all([
      ...notifications.push.map(this.pushCreate.bind(this)),
      ...notifications.email.map(this.emailCreate.bind(this)),
    ]);
  }

  async sendNotificationContentToQueue(
    type,
    provider,
    content,
    action = undefined
  ) {
    await sqs.sendMessage({
      type,
      provider,
      content,
      action,
    });
  }
}

module.exports = { Notification, notificationCategories };
