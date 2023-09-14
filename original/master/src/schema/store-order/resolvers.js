// const { first, get } = require('lodash');
const { addLocalizationField } = require('../../lib/util');
const {
  storeOrderStatusName,
} = require('../root/enums');
const moment = require('moment');

module.exports = {
  StoreOrder: {
    storeOrderSet({ storeOrderSetId }, args, context) {
      return context.storeOrderSet.getById(storeOrderSetId);
    },
    async brand({ brandId }, args, context) {
      return addLocalizationField(await context.brand.getById(brandId), 'name');
    },
    async createdAt({ created }) {
      return created;
    },
    async updatedAt({ updated }) {
      return updated;
    },
    async currentStatus({ id }, args, context) {
      const latestStatus = await context.storeOrderStatus.getLatestByStoreOrder(
        id
      );
      if (latestStatus) {
        return latestStatus.status;
      }
    },

    async products({ id }, args, context) {
      return addLocalizationField(
        await context.storeOrderProduct.getAllByStoreOrder(id),
        'name'
      );
    },
    statusHistory({ id }, args, context) {
      return context.storeOrderStatus.getAllByStoreOrder(id);
    },
    async currency({ id }, args, context) {
      return addLocalizationField(
        addLocalizationField(
          await context.storeOrder.getCurrency(id),
          'symbol'
        ),
        'subunitName'
      );
    },
    async trackingInfo({ id }, args, context) {
      return context.trackingInfo.getByStoreOrder(id);
    },
    async currentStatusDate({ id, storeOrderSetId}, args, context) {
      const latestStatus = await context.storeOrderStatus.getLatestByStoreOrder(
        id
      );
      if (latestStatus) {
        const currentStatus = latestStatus.status;
        if (currentStatus === storeOrderStatusName.INITIATED) {
          return null;
        } else if (currentStatus === storeOrderStatusName.PLACED || currentStatus === storeOrderStatusName.DISPATCHED) {
          const fulfillment = await context.storeOrderSetFulfillment.getByStoreOrderSet(storeOrderSetId);
          if (fulfillment && fulfillment.deliveryEstimate) {
            return moment(fulfillment.time)
              .add(fulfillment.deliveryEstimate, 'hours')
              .format();
          }
        } else {
          const status = await context.storeOrderStatus.getStatusByStoreOrderAndStatus(id, latestStatus.status);
          return status ? status.updated : null;
        }
      }
      return null;
    },
  },
};
