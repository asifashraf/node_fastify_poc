const { map } = require('lodash');

const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');

class ProductImage extends BaseModel {
  constructor(db, context) {
    super(db, 'product_images', context);
    this.loaders = createLoaders(this);
  }

  prouctsImages(productIds) {
    return this.db(this.tableName)
      .select('product_id', 'url')
      .whereIn('product_id', productIds)
      .groupBy('product_id', 'url');
  }

  async sortProductImages(ids) {
    if (ids.length > 0) {
      const items = map(ids, (id, sortOrder) => ({ id, sortOrder }));
      await this.save(items);
    }
    return true;
  }

  async deleteAllProductImages(productId) {
    return this.db(this.tableName)
      .where('product_id', productId)
      .del();
  }

  // async validate(input) {
  //   const errors = [];
  //   return errors;
  // }
}

module.exports = ProductImage;
