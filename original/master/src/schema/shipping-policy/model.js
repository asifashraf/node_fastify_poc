const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');

class ShippingPolicy extends BaseModel {
  constructor(db, context) {
    super(db, 'shipping_policies', context);
    this.loaders = createLoaders(this);
  }

  filterShippingPolicies(query, filters = {}) {
    if (Object.keys(filters).length === 0) {
      return query;
    }
    if (filters.countryId) {
      query.where('country_id', filters.countryId);
    }
    if (filters.status && filters.status !== 'ALL') {
      query.where('status', filters.status);
    }
    return query;
  }

  getAll(filters) {
    let query = super.getAll().select(this.db.raw(`${this.tableName}.*`));
    if (filters) {
      query = this.filterShippingPolicies(query, filters);
    }
    return query;
  }

  async getCurrency(shippingPolicyId) {
    return this.loaders.currency.load(shippingPolicyId);
  }

  // async validate(input) {
  //   const errors = [];
  //   return errors;
  // }
}

module.exports = ShippingPolicy;
