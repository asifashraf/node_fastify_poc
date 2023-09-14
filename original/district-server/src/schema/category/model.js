const { map, uniq, includes, omit } = require('lodash');

const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');
const { statusTypes } = require('../root/enums');
const { categorySaveError } = require('./enums');
const {
  addLocalizationField,
  transformToCamelCase,
  removeLocalizationField
} = require('../../lib/util');

class Category extends BaseModel {
  constructor(db, context) {
    super(db, 'categories', context);
    this.loaders = createLoaders(this);
  }

  filterCategories(query, filters) {
    if (typeof filters.status === 'undefined') {
      filters.status = 'ALL';
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
    if (filters.countryId) {
      query.whereRaw(`((ccTemp.count is NOT NULL and cc.country_id = '${filters.countryId}') OR ccTemp.count is NULL)`);
    }
    return query;
  }

  getAll(filters) {
    let query = super.getAll()
      .select(this.db.raw(`${this.tableName}.*`))
      .joinRaw(`LEFT JOIN (SELECT count(*), category_id from categories_countries GROUP BY category_id) as ccTemp 
        ON ccTemp.category_id = categories.id`)
      .leftJoin('categories_countries as cc', 'cc.category_id', 'categories.id');
    if (filters) {
      query = this.filterCategories(query, filters);
    }
    return query.orderBy('sort_order', 'asc');
  }

  async getAllPaged(paging, filters) {
    const query = this.getAll(filters);
    let response = {};
    if (paging) {
      response = await this.queryHelper(query)
        .addPaging(paging)
        .addCounting()
        .resolvePagedQuery();
    } else {
      const items = await query;
      response = {
        paging: {
          totalItems: items.length,
          totalPages: 1,
          currentPage: 1,
        },
        items
      };
    }
    if (response.items) {
      response.items = addLocalizationField(response.items, 'name');
    }
    return response;
  }

  async sortCategories(ids) {
    const errors = [];
    if (ids.length > 0) {
      const uniqueIds = [...new Set(ids)];
      const [{count}] = await this.db(this.tableName).count('*').whereIn('id', uniqueIds);
      if (count != uniqueIds.length) {
        errors.push(categorySaveError.INVALID_CATEGORY);
      } else {
        await this.db(this.tableName).update({sortOrder: 0});
        const items = map(uniqueIds, (id, sortOrder) => ({ id, sortOrder }));
        await super.save(items);
        return {sorted: true};
      }
    } else errors.push(categorySaveError.CATEGORY_IDS_LENGTH_MUST_BE_GREATER_THAN_ZERO);
    return {sorted: false, errors};
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

  async validate(input) {
    const errors = [];
    if (input.countryIds?.length > 0) {
      const countryIds = uniq(input.countryIds);
      const countryNumber = await this.roDb('countries')
        .select(this.roDb.raw('count(id)'))
        .whereIn('id', countryIds).first();
      if (countryIds.length != countryNumber.count) {
        errors.push(categorySaveError.INVALID_COUNTRY_ID);
      }
    }
    return errors;
  }

  async save(input) {
    const categoryInput = removeLocalizationField(omit(input, ['countryIds']), 'name');
    const { countryIds } = input;
    const categoryId = await super.save(categoryInput);
    await this.categoryCountriesSave(categoryId, countryIds);
    return categoryId;
  }

  async categoryCountriesSave(categoryId, countryIds = []) {
    await this.db('categories_countries')
      .where('category_id', categoryId)
      .del();

    if (countryIds.length > 0) {
      const items = map(countryIds, countryId => ({ categoryId, countryId }));
      await this.db('categories_countries').insert(items);
    }
    await this.loaders.countries.clear(categoryId);
    return categoryId;
  }

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
