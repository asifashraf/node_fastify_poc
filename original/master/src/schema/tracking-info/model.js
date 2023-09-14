const { first } = require('lodash');

const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');
const { paymentStatusOrderType } = require('../root/enums');
const { transformToCamelCase } = require('../../lib/util');

class TrackingInfo extends BaseModel {
  constructor(db, context) {
    super(db, 'tracking_infos', context);
    this.loaders = createLoaders(this);
  }

  async getByStoreOrder(storeOrderId) {
    return this.db(this.tableName)
      .where('order_type', paymentStatusOrderType.STORE_ORDER)
      .andWhere('reference_id', storeOrderId)
      .then(transformToCamelCase)
      .then(first);
  }
}

module.exports = TrackingInfo;
