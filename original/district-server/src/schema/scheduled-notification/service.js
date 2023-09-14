const Axios = require('axios');
const { scheduledNotificationService } = require('../../../config');
const { scheduledNotificationValidationErrorEnums } = require('../root/enums');

class ScheduledNotificationService {
  constructor(context) {
    this.context = context;
    this.axios = Axios.create({
      baseURL: scheduledNotificationService.url,
      timeout: scheduledNotificationService.timeout,
    });
  }
  validateNotificationEvent(notificationEvent) {
    const errors = [];
    if (!notificationEvent) {
      errors.push(
        scheduledNotificationValidationErrorEnums.EVENT_IS_NULL_OR_UNDEFINED
      );
      return errors;
    }
    if (!notificationEvent.type) {
      errors.push(scheduledNotificationValidationErrorEnums.MISSING_EVENT_TYPE);
    }
    if (!notificationEvent.data) {
      errors.push(scheduledNotificationValidationErrorEnums.MISSING_EVENT_DATA);
    }
    if (!notificationEvent.tokens) {
      errors.push(
        scheduledNotificationValidationErrorEnums.MISSING_EVENT_DEVICE_TOKENS
      );
    }
    return errors;
  }

  async getBrandLocationListenerTokens(brandLocationId) {
    return this.context.adminBranchSubscription
      .getByBranchId(brandLocationId)
      .then(listeners => listeners.map(listener => listener.subscriptionToken));
  }

  includeDefaultDelayIfNotExists(notificationEvent) {
    return {
      waitseconds: scheduledNotificationService.defaultDelayInSeconds,
      ...notificationEvent,
    };
  }

  async sendScheduledNotification(notificationEvent) {
    const errors = this.validateNotificationEvent(notificationEvent);
    if (errors.length > 0) {
      console.log('sendScheduledNotification errors : ', errors);
      return false;
    }
    notificationEvent = this.includeDefaultDelayIfNotExists(notificationEvent);
    try {
      const { data } = await this.axios.post(
        '/stock-notifications/reminder',
        notificationEvent
      );
      console.log('Success on send scheduled Notification : ', data);
      return true;
    } catch (err) {
      console.log('Error on sendScheduledNotification network call : ', err);
      return false;
    }
  }
}
module.exports = ScheduledNotificationService;
