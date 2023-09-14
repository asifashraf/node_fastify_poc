const { notificationType } = require('../../../../src/schema/root/enums');
const firebase = require('../../firebase');
module.exports = function () {
  return async function ({ data, brand, menu, qContext }) {
    const { type } = data;
    const brandListeners = qContext.adminBranchSubscription
      .getByBrandId(brand.id)
      .then(listeners => listeners.map(listener => listener.subscriptionToken));
    if (type === notificationType.FOODICS_SYNC_STARTED) {
      await brandListeners.then(tokens =>
        (tokens.length > 0
          ? firebase.sendNotifications(
            notificationType.FOODICS_SYNC_STARTED,
            { orderSetId: null },
            {
              title: 'Foodics Data Sync',
              body: 'Foodics data sync has started.',
            },
            tokens
          )
          : Promise.resolve(true))
      );
    }
    if (type === notificationType.FOODICS_SYNC_COMPLETED) {
      await brandListeners.then(tokens =>
        (tokens.length > 0
          ? firebase.sendNotifications(
            notificationType.FOODICS_SYNC_COMPLETED,
            { orderSetId: null },
            {
              title: 'Foodics Data Sync',
              body: 'Foodics data sync has completed.',
            },
            tokens
          )
          : Promise.resolve(true))
      );
    }
    return { message: null, done: true };
  };
}();
