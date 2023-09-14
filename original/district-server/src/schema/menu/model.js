const BaseModel = require('../../base-model');
const { first } = require('lodash');
const { brandMenuError } = require('../root/enums');
const { invalidateMenu } = require('../c-menu/utils');

class Menu extends BaseModel {
  constructor(db) {
    super(db, 'menus');
  }

  getAll() {
    return super
      .getAll()
      .select('menus.*')
      .join('brands', 'brands.id', 'menus.brand_id')
      .orderBy('brands.name');
  }

  /**
   * @deprecated
   * @param brandId
   * @returns Promise
   */
  getByBrand(brandId) {
    return this.db(this.tableName)
      .where('brand_id', brandId)
      .then(first); // .where returns an array, we're expecting an object.
  }

  getAllByBrand(brandId) {
    return this.db(this.tableName).where('brand_id', brandId);
  }

  getByBrandAndCountry(brandId, countryId) {
    return this.db(this.tableName)
      .where('brand_id', brandId)
      .andWhere('country_id', countryId)
      .first(); // .where returns an array, we're expecting an object.
  }

  async validate(menu, context) {
    const errors = [];
    const isValidBrand = await context.brand.isValid({ id: menu.brandId });

    if (!isValidBrand) {
      errors.push(brandMenuError.INVALID_BRAND);
    }
    return errors;
  }

  async save(menu) {
    const id = await super.save(menu);
    await invalidateMenu(id);
    return id;
  }

  async getBrandsByMenuId(menuIds) {
    const menus = await this.db(this.tableName)
      .whereIn('id', menuIds);
    return menus.map(menu => menu.brandId);
  }

  getByBrands(brandIds) {
    return super
      .getAll()
      .select('menus.*')
      .joinRaw(
        'left join brands as b ON menus.brand_id = b.id and menus.country_id = b.country_id'
      )
      .whereIn('b.id', brandIds)
      .orderBy('b.name');
  }
}

module.exports = Menu;
