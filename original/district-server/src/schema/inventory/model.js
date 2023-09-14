// const { map } = require('lodash');

const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');
// const { transformToCamelCase } = require('../../lib/util');

class Inventory extends BaseModel {
  constructor(db, context) {
    super(db, 'inventories', context);
    this.loaders = createLoaders(this);
  }

  filterInventories(query, filters = {}) {
    if (Object.keys(filters).length === 0) {
      return query;
    }
    return query;
  }

  getAll(filters) {
    let query = super.getAll().select(this.db.raw(`${this.tableName}.*`));
    if (filters) {
      if (filters.product_id) {
        query
          .whereRaw('product_id = ?', filters.product_id);
      }
      query = this.filterInventories(query, filters);
    }
    return query;
  }

  async deleteAllProductInventories(productId) {
    return this.db(this.tableName)
      .where('product_id', productId)
      .del();
  }

  // async validate(input) {
  //   const errors = [];
  //   return errors;
  // }
}

module.exports = Inventory;
