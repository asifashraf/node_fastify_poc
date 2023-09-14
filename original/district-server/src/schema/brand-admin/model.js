const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');
const { transformToCamelCase } = require('../../lib/util');
const { first } = require('lodash');

class BrandAdmin extends BaseModel {
  constructor(db, context) {
    super(db, 'brand_admins', context);
    this.loaders = createLoaders(this);
  }

  async getAdminBrand(adminId) {
    return this.db(this.tableName)
      .select('brands.*')
      .join('brands', 'brands.id', `${this.tableName}.brand_id`)
      .where(`${this.tableName}.admin_id`, adminId)
      .whereNull(`${this.tableName}.brand_location_id`)
      .first();
  }

  async getAdminBrandLocation(adminId) {
    return this.db(this.tableName)
      .select('brand_locations.*')
      .join(
        'brand_locations',
        'brand_locations.id',
        `${this.tableName}.brand_location_id`
      )
      .where(`${this.tableName}.admin_id`, adminId)
      .whereNotNull(`${this.tableName}.brand_location_id`)
      .then(transformToCamelCase)
      .then(first);
  }

  async getByAdminId(adminId, brandId) {
    const query = this.getAll().where('admin_id', adminId);
    if (brandId) {
      query.where('brand_id', brandId);
    }
    return query;
  }

  async validate() {
    const errors = [];

    return errors;
  }

  isAlreadyBrandAdmin(email) {
    return this.db(this.tableName)
      .select(
        'admins.*',
        `${this.tableName}.brand_id`,
        `${this.tableName}.brand_location_id`,
        'brands.name as brand_name',
        'brand_locations.name as brand_location_name'
      )
      .join('admins', 'admins.id', `${this.tableName}.admin_id`)
      .leftJoin('brands', 'brands.id', `${this.tableName}.brand_id`)
      .leftJoin(
        'brand_locations',
        'brand_locations.id',
        `${this.tableName}.brand_location_id`
      )
      .where('admins.email', email);
  }

  getByBrandId(brandId) {
    return this.db(this.tableName).where('brand_id', brandId);
  }

  getByBrandAndBrandLocationId(brandId, brandLocationId) {
    return this.db(this.tableName)
      .where('brand_id', brandId)
      .where('brand_location_id', brandLocationId);
  }

  deleteById(id) {
    return this.db(this.tableName)
      .where('id', id)
      .del();
  }

  getByBrandAndLocationId(brandId, brandLocationId) {
    return this.db(this.tableName)
      .where('brand_id', brandId)
      .where('brand_location_id', brandLocationId);
  }

  getByAdminBrandAndLocationId(adminId, brandId, brandLocationId) {
    return this.db(this.tableName)
      .where('admin_id', adminId)
      .where('brand_id', brandId)
      .where('brand_location_id', brandLocationId)
      .first();
  }

  getOnlyBrandAdminByAdminId(adminId) {
    const query = this.getAll().where('admin_id', adminId).andWhere('brand_location_id', null);
    return query;
  }
}

module.exports = BrandAdmin;
