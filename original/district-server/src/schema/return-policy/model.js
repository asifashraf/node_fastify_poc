const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');

class ReturnPolicy extends BaseModel {
  constructor(db, context) {
    super(db, 'return_policies', context);
    this.loaders = createLoaders(this);
  }

  filterReturnPolicies(query, filters = {}) {
    if (Object.keys(filters).length === 0) {
      return query;
    }
    return query;
  }

  getAll(filters) {
    let query = super.getAll().select(this.db.raw(`${this.tableName}.*`));
    if (filters) {
      query = this.filterReturnPolicies(query, filters);
    }
    return query;
  }

  deleteByProduct(productId) {
    return this.db(this.tableName)
      .where('product_id', productId)
      .del();
  }

  // async validate(input) {
  //   const errors = [];
  //   return errors;
  // }
}

module.exports = ReturnPolicy;
