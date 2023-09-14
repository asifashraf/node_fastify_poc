const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');

class OrderSetComments extends BaseModel {
  constructor(db) {
    super(db, 'order_set_comments');
    this.loaders = createLoaders(this);
  }

  getAllByOrderSetId(orderSetId) {
    return this.loaders.byOrderSet.load(orderSetId);
  }
}

module.exports = OrderSetComments;
