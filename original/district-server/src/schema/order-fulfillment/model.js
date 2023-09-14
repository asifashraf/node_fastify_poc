const BaseModel = require('../../base-model');
const { assign } = require('lodash');
const {
  orderAssignCourierError,
  setCustomerPresentError,
} = require('../root/enums');
const { createLoaders } = require('./loaders');

class OrderFulfillment extends BaseModel {
  constructor(db, context) {
    super(db, 'order_fulfillment', context);
    this.loaders = createLoaders(this);
  }

  getByOrderSet(orderSetId) {
    return this.loaders.byOrderSet.load(orderSetId);
  }

  getFulfillmentIdByOrderSet(orderSetId) {
    return this.roDb(this.tableName)
      .select('id')
      .where('order_set_id', orderSetId)
      .first()
      .then(result => (result ? result.id : null));
  }

  getFulfillmentTypeByOrderSet(orderSetId) {
    return this.roDb(this.tableName)
      .select('type')
      .where('order_set_id', orderSetId)
      .first()
      .then(result => (result ? result.type : null));
  }

  // Validations
  async validateCourierAssignment(orderSetId, courierName) {
    const errors = [];
    const isValidOrder = await this.context.orderSet.isValid({
      id: orderSetId,
    });

    if (!isValidOrder) {
      errors.push(orderAssignCourierError.INVALID_ORDER);
    }

    if (courierName.length === 0) {
      errors.push(orderAssignCourierError.INVALID_COURIER);
    }

    return errors;
  }

  async assignCourierByOrderSetId(orderSetId, courierName) {
    const current = await this.getByOrderSet(orderSetId);

    await super.save(assign(current, { courierName }));
  }

  async assignDriverByOrderSetId(orderSetId, driverId) {
    const current = await this.getByOrderSet(orderSetId);

    await super.save(assign(current, { driverId }));
  }

  async assignDeliveryInfoByOrderSetId(orderSetId, deliveryInfo = {}) {
    let current = await this.getByOrderSet(orderSetId);
    current = assign(current, deliveryInfo);
    await super.save(current);
  }

  async setCustomerIsPresent(orderSetId, customerId) {
    const orderSet = await this.context.orderSet.getById(orderSetId);
    let shouldNotify = false;

    if (!orderSet) {
      return {
        error: setCustomerPresentError.INVALID_ORDER,
      };
    }

    if (orderSet.customerId !== customerId) {
      return {
        error: setCustomerPresentError.INVALID_CUSTOMER,
      };
    }

    const fulfillment = await this.getByOrderSet(orderSet.id);
    if (!fulfillment.isCustomerPresent) {
      shouldNotify = true;
      await super.save({
        ...fulfillment,
        isCustomerPresent: true,
      });
      // Woohoo cache invalidation
      this.loaders.byOrderSet.clear(orderSet.id);
    }

    return {
      shouldNotify,
      orderSet,
    };
  }
}

module.exports = OrderFulfillment;
