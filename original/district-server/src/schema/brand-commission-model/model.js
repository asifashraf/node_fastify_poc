const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');
const { first } = require('lodash');

class BrandCommissionModel extends BaseModel {
  constructor(db, context) {
    super(db, 'brand_commission_models', context);
    this.loaders = createLoaders(this);
  }

  async getCurrentBrandModel(brandId) {
    return this.db(this.tableName)
      .where('brand_id', brandId)
      .whereNull('end_time')
      .then(first);
  }
}

module.exports = BrandCommissionModel;
