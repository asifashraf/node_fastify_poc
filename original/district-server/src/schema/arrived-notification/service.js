const Axios = require('axios');
const SlackWebHookManager = require(
  '../slack-webhook-manager/slack-webhook-manager'
);

const { arrivedNotificationService } = require('../../../config');

class ArrivedNotificationService {
  constructor(context) {
    this.context = context;
    this.axios = Axios.create({
      baseURL: arrivedNotificationService.url,
      timeout: 10000,
    });
  }


  /**
       * Create order check event after specified time with lambda
       * @param {uuid} arrivedNotificationEvent.orderSetId
       * @param {string} arrivedNotificationEvent.customerId
       * @param {string} arrivedNotificationEvent.header - 32 length random string
       * @param {int} arrivedNotificationEvent.waitseconds
       * @returns {Promise<boolean>}
       */
  async checkOrderAfterWait(arrivedNotificationEvent) {
    try {
      console.log(arrivedNotificationEvent);
      await this.axios.post(
        '/check',
        arrivedNotificationEvent,
      );
      return true;
    } catch (err) {
      console.log(err);
      SlackWebHookManager.sendTextToSlack(`
        arrivedNotificationEvent event creation failed!
          parameters -> ${JSON.stringify(arrivedNotificationEvent)}
          err -> ${JSON.stringify(err)}
          place -> src/schema/arrived-notification/service.js:38
        `).catch(err => console.log({
        place: 'src/schema/arrived-notification/service.js:38',
        err: JSON.stringify(err),
      }));
    }
    return false;
  }
}

module.exports = ArrivedNotificationService;
