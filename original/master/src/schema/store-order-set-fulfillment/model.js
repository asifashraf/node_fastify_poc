const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');

class StoreOrderSetFulfillment extends BaseModel {
  constructor(db, context) {
    super(db, 'store_order_set_fulfillment', context);
    this.loaders = createLoaders(this);
  }

  async getByStoreOrderSet(storeOrderSetId) {
    return this.loaders.byStoreOrderSet.load(storeOrderSetId);
  }
}

module.exports = StoreOrderSetFulfillment;
