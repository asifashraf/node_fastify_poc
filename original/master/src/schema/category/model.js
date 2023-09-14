const { map, uniq, includes } = require('lodash');

const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');
const { statusTypes } = require('../root/enums');
const {
  addLocalizationField,
  transformToCamelCase,
} = require('../../lib/util');

class Category extends BaseModel {
  constructor(db, context) {
    super(db, 'categories', context);
    this.loaders = createLoaders(this);
  }

  filterCategories(query, filters) {
    if (typeof filters.status === 'undefined') {
      filters.status = statusTypes.ACTIVE;
    }
    if (filters.status !== 'ALL') {
      query.where(`${this.tableName}.status`, filters.status);
    }

    if (filters.searchText) {
      filters.searchText = filters.searchText.toLowerCase().trim();
      query.whereRaw(
        `(LOWER(${this.tableName}.name) like ? or ${this.tableName}.name_ar like ? or ${this.tableName}.name_tr like ? )`
        , [`%${filters.searchText}%`, `%${filters.searchText}%`, `%${filters.searchText}%`],
      );
    }
    return query;
  }

  getAll(filters) {
    let query = super.getAll().select(this.db.raw(`${this.tableName}.*`));
    if (filters) {
      query = this.filterCategories(query, filters);
    }
    return query.orderBy('sort_order', 'asc');
  }

  async getAllPaged(paging, filters) {
    const query = this.getAll(filters);
    const response = await this.queryHelper(query)
      .addPaging(paging)
      .addCounting()
      .resolvePagedQuery();
    if (response.items) {
      response.items = addLocalizationField(response.items, 'name');
    }
    return response;
  }

  async sortCategories(ids) {
    if (ids.length > 0) {
      const items = map(ids, (id, sortOrder) => ({ id, sortOrder }));
      await this.save(items);
    }
    return true;
  }

  async getAllProductsInCountry(categoryId, countryCode) {
    const query = this.roDb
      .select('products.*')
      .from('products_categories')
      .join('products', 'products.id', 'products_categories.product_id')
      .join('brands', 'brands.id', 'products.brand_id')
      .join('countries', 'countries.id', 'brands.country_id')
      .where('products_categories.category_id', categoryId)
      .andWhere('products.status', statusTypes.ACTIVE)
      .whereRaw(
        'LOWER(countries.iso_code) = ?',
        countryCode.toString().toLowerCase()
      );
    const products = await this.context.sqlCache(query);
    return addLocalizationField(
      addLocalizationField(
        addLocalizationField(products, 'name'),
        'description'
      ),
      'returnPolicy'
    );
  }

  async getAllProducts(categoryId) {
    const query = this.db
      .select('products.*')
      .from('products_categories AS pc')
      .join('products', 'products.id', 'pc.product_id')
      .where('pc.category_id', categoryId);
    const products = await this.context.sqlCache(query);
    return addLocalizationField(
      addLocalizationField(
        addLocalizationField(products, 'name'),
        'description'
      ),
      'returnPolicy'
    );
  }

  // async validate(input) {
  //   const errors = [];
  //   return errors;
  // }

  async getAllProductsInCountryNew(categoryId, countryId) {
    const query = `
      select p.*,
      pi2.id as product_image_id,
      pi2.url,
      rp.id as return_policy_id,
      rp."name" as return_policy_name,
      rp.returnable,
      rp.return_time_frame,
      rp.description as return_policy_description,
      rp.description_ar as return_policy_description_ar,
      rp.description_tr as return_policy_description_tr
      from products p
      left join product_images pi2 on pi2.product_id = p.id
      left join return_policies rp on rp.product_id = p.id
      left join products_categories pc on pc.product_id = p.id
      left join brands b on b.id = p.brand_id
      where pc.category_id = ? and  p.status = ? and b.country_id = ?
    `;
    const queryInputs = [categoryId, 'ACTIVE', countryId];
    const productsWithDetails = await this.roDb
      .raw(query, queryInputs)
      .then(result => transformToCamelCase(result.rows));
    const products = map(productsWithDetails, product => {
      const retVal = product;

      const imageIds = uniq(
        map(
          productsWithDetails.filter(
            productGeneral => productGeneral.id === product.id
          ),
          productGeneral => productGeneral.productImageId
        )
      );
      retVal.images = map(
        productsWithDetails.filter(productGeneral =>
          includes(imageIds, productGeneral.productImageId)
        ),
        image => {
          const imageRet = {};
          imageRet.id = image.productImageId;
          imageRet.url = image.url;
          return imageRet;
        }
      );
      const returnPolicyDescription = addLocalizationField(
        product,
        'returnPolicyDescription'
      );
      retVal.returnPolicy = {};
      retVal.returnPolicy.id = product.returnPolicyId;
      retVal.returnPolicy.name = product.returnPolicyName;
      retVal.returnPolicy.returnable = product.returnable;
      retVal.returnPolicy.returnTimeFrame = product.returnTimeFrame;
      retVal.returnPolicy.description =
        returnPolicyDescription.returnPolicyDescription;
      return retVal;
    });
    const uniqueIds = [...new Set(products.map(product => product.id))];
    const uniqueProducts = uniqueIds.map(uniqueId => products.find(product => product.id == uniqueId));
    return addLocalizationField(
      addLocalizationField(uniqueProducts, 'name'),
      'description'
    );
  }
  async getAllProductsInCountryByCountryId(categoryId, countryId) {
    const query = this.roDb
      .select('products.*')
      .from('products_categories')
      .join('products', 'products.id', 'products_categories.product_id')
      .join('brands', 'brands.id', 'products.brand_id')
      .where('products_categories.category_id', categoryId)
      .andWhere('products.status', statusTypes.ACTIVE)
      .whereRaw('brands.country_id = ?', countryId);
    const products = await this.context.sqlCache(query);
    return addLocalizationField(
      addLocalizationField(
        addLocalizationField(products, 'name'),
        'description'
      ),
      'returnPolicy'
    );
  }
}

module.exports = Category;
