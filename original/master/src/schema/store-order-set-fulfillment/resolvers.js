const moment = require('moment');
module.exports = {
  StoreOrderSetFulfillment: {
    storeOrderSet({ storeOrderSetId }, args, context) {
      return context.storeOrderSet.getById(storeOrderSetId);
    },
    async deliveryEstimateDateTime({ time, deliveryEstimate }) {
      if (deliveryEstimate) {
        return moment(time)
          .add(deliveryEstimate, 'hours')
          .format();
      }
      return null;
    },
  },
};
