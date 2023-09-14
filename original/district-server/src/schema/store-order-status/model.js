const { first, isEmpty, map } = require('lodash');

const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');
const {
  storeOrderStatusName,
  storeOrderStatusError,
} = require('../root/enums');
const { notificationsForStatusChange } = require('./notifications');

class StoreOrderStatus extends BaseModel {
  constructor(db, context) {
    super(db, 'store_order_statuses', context);
    this.loaders = createLoaders(this);
  }

  getAllByStoreOrder(storeOrderId) {
    this.loaders.statusHistory.clear(storeOrderId);
    return this.loaders.statusHistory.load(storeOrderId);
  }

  getLatestByStoreOrder(storeOrderId) {
    return this.getAllByStoreOrder(storeOrderId).then(first);
  }

  getStatusByStoreOrderAndStatus(storeOrderId, status) {
    return this.db(this.tableName)
      .where('status', status)
      .andWhere('store_order_id', storeOrderId)
      .first();
  }

  async insertStatusByStoreOrderSet(storeOrderSetId, status) {
    let storeOrders = await this.context.storeOrder.getAllByStoreOrderSet(
      storeOrderSetId
    );

    if (!isEmpty(storeOrders)) {
      storeOrders = map(storeOrders, so => {
        return this.save({
          storeOrderId: so.id,
          status,
        });
      });

      await Promise.all(storeOrders);
    }
  }

  async setStatus(storeOrderId, status, context) {
    const latestStatus = await this.getLatestByStoreOrder(storeOrderId);
    if ((latestStatus && latestStatus.status !== status) || !latestStatus) {
      const id = await this.save({
        storeOrderId,
        status,
      });
      const notifs = await notificationsForStatusChange(
        storeOrderId,
        status,
        context
      );
      await context.notification.createAllIn(notifs);

      const storeOrder = await context.storeOrder.getById(storeOrderId);
      await context.storeOrderSetStatus.updateStatus(
        storeOrder.storeOrderSetId,
        context
      );

      return id;
    }

    return latestStatus.id;
  }

  async validate(input) {
    const errors = [];
    const latestStatus = await this.getLatestByStoreOrder(input.storeOrderId);
    if (latestStatus && latestStatus.status == input.status) {
      errors.push(storeOrderStatusError.STATUS_HAS_BEEN_ALREADY_CHANGED);
      return errors;
    }
    if (input.status === storeOrderStatusName.DELIVERED) {
      const storeOrder = await this.context.storeOrder.getById(
        input.storeOrderId
      );
      const statusHistory = await this.context.paymentStatus.getAllByStoreOrderSetId(
        storeOrder.storeOrderSetId
      );

      const currentStatus = first(statusHistory);
      // console.log('currentStatus', currentStatus);
      if (currentStatus) {
        if (currentStatus.name !== 'PAYMENT_SUCCESS') {
          errors.push(storeOrderStatusError.PAYMENT_DUE);
        }
      } else {
        errors.push(storeOrderStatusError.PAYMENT_DUE);
      }
    }

    return errors;
  }
}

module.exports = StoreOrderStatus;
