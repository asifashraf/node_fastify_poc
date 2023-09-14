const BaseModel = require('../../base-model');
const { first, get, pick, uniq, assign } = require('lodash');
const { marketingNotificationSaveError } = require('../root/enums');
const moment = require('moment-timezone');
const {
  addPaging,
  formatErrorResponse,
  now,
  generateShortCode,
} = require('../../lib/util');
const { notificationCategories } = require('../../lib/notifications');

class MarketingNotification extends BaseModel {
  constructor(db, context) {
    super(db, 'marketing_notifications', context);
  }

  async getAll(countryId, paging) {
    const numResultsQuery = this.db(this.tableName);
    if (countryId) {
      numResultsQuery.where('country_id', countryId);
    }
    const numResults = get(await numResultsQuery.count('*'), '[0].count', 0);

    const query = this.db(this.tableName)
      .join(
        'notifications',
        'marketing_notifications.notification_id',
        'notifications.id'
      )
      .orderBy('embargo_date', 'desc')
      .select('marketing_notifications.*');

    if (countryId) {
      query.where('marketing_notifications.country_id', countryId);
    }
    return {
      numResults,
      notifications: await addPaging(query, paging),
    };
  }

  // Validations
  async validate(marketingNotification) {
    const errors = [];

    if (marketingNotification.id) {
      const existing = await this.getById(marketingNotification.id);
      if (existing) {
        const notification = await this.context.notification.getById(
          existing.notificationId
        );
        if (notification.status !== 'pending') {
          errors.push(
            marketingNotificationSaveError.CAN_ONLY_UPDATE_PENDING_NOTIFICATIONS
          );
        }
      } else {
        errors.push(
          marketingNotificationSaveError.INVALID_MARKETING_NOTIFICATION
        );
      }
    }

    // A date must be provided that is in the future
    const nowTime = now.get();
    const embargoDate = moment(
      get(marketingNotification, 'embargoDate', nowTime)
    );

    if (embargoDate.isBefore(nowTime)) {
      errors.push(marketingNotificationSaveError.INVALID_DATE);
    }

    // A platform must be selected (targetAll, targetAndroid, or targetIos)
    const targets = uniq([
      get(marketingNotification, 'targetAll', false),
      get(marketingNotification, 'targetAndroid', false),
      get(marketingNotification, 'targetIos', false),
    ]);

    if (targets.length === 1 && first(targets) === false) {
      errors.push(marketingNotificationSaveError.INVALID_TARGET);
    }

    return errors;
  }

  async save(input) {
    const marketingNotification = pick(input, [
      'id',
      'title',
      'message',
      'targetAll',
      'targetAndroid',
      'targetIos',
      'countryId',
    ]);

    // Validate Order
    const validationErrors = await this.validate(
      pick(input, [
        'embargoDate',
        'targetAll',
        'targetAndroid',
        'targetIos',
        'id',
      ])
    );

    if (validationErrors.length > 0) {
      return formatErrorResponse(validationErrors);
    }

    const { title, message } = input;

    const embargoDate = input.embargoDate
      ? input.embargoDate.toISOString()
      : null;

    const notification = {
      title,
      body: message,
    };

    let notificationId;

    if (input.id) {
      // If we are updating an existing marketing_notification, we need to also update the
      // related notifications row
      const existing = await this.getById(input.id);
      notificationId = existing.notificationId;
      await this.db('notifications')
        .where({ id: notificationId })
        .update('embargo_date', embargoDate);
    } else {
      marketingNotification.shortCode = generateShortCode();
      notificationId = await this.context.notification.pushCreate({
        message: notification,
        data: { id: marketingNotification.shortCode },
        notificationCategory: notificationCategories.NEW_OFFER,
        embargoDate,
        disable: false,
      });
    }

    const marketingNotificationId = await super.save(
      assign({}, marketingNotification, { notificationId })
    );

    return { marketingNotificationId };
  }

  async delete(id) {
    const marketingNotification = await this.getById(id);
    if (marketingNotification) {
      return this.context.notification.deleteById(
        marketingNotification.notificationId
      );
    }
  }
}

module.exports = MarketingNotification;
