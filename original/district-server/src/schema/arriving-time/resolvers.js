const { popupStatusSaveError, saveArrivedError } = require('./enums');

module.exports = {
  Query: {
    async getBranchArrivingTimeList(
      root,
      { branchId, countryId, fulfillmentType },
      context
    ) {
      return context.arrivingTime.getBranchArrivingTimeList(
        branchId, countryId, fulfillmentType
      );

    },
  },
  Mutation: {
    async saveArrival(
      root,
      { orderSetId },
      context
    ) {
      const customerId = context.auth.id;
      const orderSet = await context.orderSet.getById(orderSetId);
      const errors = [];
      if (customerId != orderSet.customerId) {
        errors.push(saveArrivedError.INVALID_CUSTOMER);
        return { errors, arrivingTime: null };
      }
      return context.arrivingTime.saveArrived(
        orderSetId
      );
    },
    async savePopupStatus(
      root,
      { },
      context
    ) {
      const customerId = context.auth.id;
      const errors = [];
      if (context.auth.authProvider != 'authentication-service' || !customerId) {
        errors.push(popupStatusSaveError.INVALID_CUSTOMER);
        return { errors, saved: false };
      }
      const arrivingPopupStatus = await context.customer.getPopUpStatus(customerId);
      if (arrivingPopupStatus) {
        errors.push(popupStatusSaveError.POPUP_ALREADY_SEEN);
        return { errors, saved: false };
      }
      const saved = await context.customer.savePopUpStatus(
        customerId
      );
      return { errors, saved };
    },
  }

};
