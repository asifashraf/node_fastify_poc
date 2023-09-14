const { get, toUpper } = require('lodash');
const { addLocalizationField } = require('../../lib/util');

module.exports = {
  MarketingNotification: {
    async embargoDate({ notificationId }, args, context) {
      const notification = await context.notification.getById(notificationId);
      return get(notification, 'embargoDate', null);
    },
    async status({ notificationId }, args, context) {
      const notification = await context.notification.getById(notificationId);
      return toUpper(get(notification, 'status', null));
    },
    async country({ countryId }, args, context) {
      const country = await context.country.getById(countryId);
      return addLocalizationField(country, 'name');
    },
  },
};
