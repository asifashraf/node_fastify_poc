const { map, omit, find, get, uniq, includes, filter, findIndex } = require('lodash');

const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');
const { statusTypes, storeOrderProductSaveError } = require('../root/enums');
const {
  addLocalizationField,
  removeLocalizationField,
  transformToCamelCase,
} = require('../../lib/util');
const Money = require('../../lib/currency');

class Product extends BaseModel {
  constructor(db, context) {
    super(db, 'products', context);
    this.loaders = createLoaders(this);
  }

  filterProducts(query, filters) {
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

    const brandIds = get(filters, 'brandIds', []);
    if (brandIds.length > 0) {
      query.whereIn(`${this.tableName}.brand_id`, brandIds);
    }

    const categoryIds = get(filters, 'categoryIds', []);
    if (categoryIds.length > 0) {
      query
        .join(
          'products_categories',
          'products_categories.product_id',
          `${this.tableName}.id`
        )
        .whereIn('products_categories.category_id', categoryIds)
        .groupBy(`${this.tableName}.id`);
    }

    if (filters.countryCode) {
      query
        .join('brands', 'brands.id', 'products.brand_id')
        .join('countries', 'countries.id', 'brands.country_id')
        .whereRaw(
          'LOWER(countries.iso_code) = ?',
          filters.countryCode.toString().toLowerCase()
        );
    }

    if (filters.countryId) {
      query
        .join('brands', 'brands.id', 'products.brand_id')
        .whereRaw('brands.country_id = ?', filters.countryId);
    }

    return query;
  }

  async getById(id, localized = false) {
    const item = await super.getById(id);
    if (!localized) {
      return item;
    }
    return addLocalizationField(
      addLocalizationField(addLocalizationField(item, 'name'), 'description'),
      'returnPolicy'
    );
  }

  getAll(filters) {
    let query = super.getAll().select(this.db.raw(`${this.tableName}.*`));
    if (filters) {
      query = this.filterProducts(query, filters);
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
      response.items = addLocalizationField(
        addLocalizationField(
          addLocalizationField(response.items, 'name'),
          'description'
        ),
        'returnPolicy'
      );
    }
    return response;
  }

  async sortProducts(ids) {
    try {
      if (ids.length > 0) {
        const products = await this.db(this.tableName).select('id').whereIn('id', ids);
        if (products.length == ids.length) {
          const items = map(ids, (id, sortOrder) => ({ id, sortOrder }));
          await super.save(items);
          return {sorted: true};
        }
      }
      return {sorted: false, error: storeOrderProductSaveError.INVALID_ID, errors: [storeOrderProductSaveError.INVALID_ID]};
    } catch (error) {
      return {sorted: false, error: storeOrderProductSaveError.PROCESS_FAILED, errors: [storeOrderProductSaveError.PROCESS_FAILED]};
    }
  }

  async productCategoriesSave(productId, categoryIds = []) {
    await this.db('products_categories')
      .where('product_id', productId)
      .del();

    if (categoryIds.length > 0) {
      const items = map(categoryIds, categoryId => ({ productId, categoryId }));
      await this.db('products_categories').insert(items);
    }
    await this.loaders.categoryIds.clear(productId);
    return productId;
  }

  async productImagesSave(productId, imageInputs = []) {
    if (imageInputs.length > 0) {
      const items = map(imageInputs, imageInput => {
        return {
          productId,
          ...imageInput,
        };
      });
      map(await this.getImages(productId), image => {
        const foundImage = find(items, i => i.id === image.id);
        if (!foundImage) {
          items.push({
            ...omit(image, ['created', 'updated', 'sortOrder']),
            deleted: true,
          });
        }
      });
      await this.context.productImage.save(items);
    } else {
      await this.context.productImage.deleteAllProductImages(productId);
    }
    await this.loaders.images.clear(productId);
    return productId;
  }

  async productInventoriesSave(productId, inventoriesInput = []) {
    if (inventoriesInput.length > 0) {
      const items = map(inventoriesInput, inventoryInput => {
        return {
          productId,
          ...inventoryInput,
        };
      });
      map(await this.getInventories(productId), inventory => {
        const foundInventory = find(items, i => i.id === inventory.id);
        if (!foundInventory) {
          items.push({
            ...omit(inventory, ['created', 'updated']),
            deleted: true,
          });
        }
      });
      await this.context.inventory.save(items);
    } else {
      await this.context.inventory.deleteAllProductInventories(productId);
    }
    await this.loaders.inventories.clear(productId);
    return productId;
  }

  async productReturnPolicySave(productId, returnPolicyInput) {
    if (returnPolicyInput) {
      const item = {
        ...removeLocalizationField(returnPolicyInput, 'description'),
        productId,
      };
      await this.context.returnPolicy.save(item);
    } else {
      await this.context.returnPolicy.deleteByProduct(productId);
    }
    await this.loaders.returnPolicy.clear(productId);
    return productId;
  }

  async getCategories(productId) {
    const rawLines = await this.loaders.categoryIds.load(productId);
    const categoryIds = map(rawLines, line => line.categoryId);
    return this.context.category.getById(categoryIds);
  }

  async getCurrency(productId) {
    return this.loaders.currency.load(productId);
  }

  async getReturnPolicy(productId) {
    return this.loaders.returnPolicy.load(productId);
  }

  async getInventories(productId) {
    return this.loaders.inventories.load(productId);
  }

  async getImages(productId) {
    return this.loaders.images.load(productId);
  }

  async getPickupLocationsWithDeliveryAddressDistance(
    productIds,
    customerAddressId,
    storeOrderSetId = null
  ) {
    const customerAddress = await this.context.customerAddress.getById(
      customerAddressId
    );
    let longitude, latitude = null;

    if (customerAddress) {
      longitude = customerAddress.longitude;
      latitude = customerAddress.latitude;
    } else if (storeOrderSetId) {
      const storeOrderSetFulfillment = await this.context.storeOrderSetFulfillment.getByStoreOrderSet(
        storeOrderSetId
      );
      if (storeOrderSetFulfillment && storeOrderSetFulfillment.deliveryAddress) {
        longitude = storeOrderSetFulfillment.deliveryAddress.longitude;
        latitude = storeOrderSetFulfillment.deliveryAddress.latitude;
      }
    }
    if ((longitude != undefined || longitude != null) && (latitude != undefined || latitude != null)) {
      const query = this.db
        .select(
          this.db.raw(`
          pickup_locations.*,
          ROUND(
            (
              ST_Distance(
                ST_Transform(pickup_locations.geolocation,7094),
                ST_Transform(ST_SetSRID(ST_Makepoint(${longitude}, ${latitude}),4326),7094)
              )
            )::numeric,2
          ) distance
        `)
        )
        .from('pickup_locations')
        .join(
          'inventories',
          'inventories.pickup_location_id',
          'pickup_locations.id'
        )
        .whereIn('inventories.product_id', productIds);
      return this.context.sqlCache(query);
    }
    return null;
  }

  async getStock(productId) {
    const inventories = await this.getInventories(productId);
    return inventories.reduce(
      (total, inventory) => parseInt(total + Number(inventory.quantity), 10),
      0
    );
  }

  async getAllBrandIds() {
    return this.db(this.tableName)
      .select('brand_id')
      .groupBy('brand_id')
      .where('status', statusTypes.ACTIVE);
  }

  async save(input) {
    const productInput = removeLocalizationField(
      removeLocalizationField(
        omit(input, ['categoryIds', 'images', 'inventories', 'returnPolicy']),
        'name'
      ),
      'description'
    );
    const { categoryIds, images, inventories, returnPolicy } = input;

    const currency = await this.context.brand.getCurrency(input.brandId);
    const newCurrencyValue = amount =>
      new Money(
        amount,
        currency.decimalPlace,
        currency.lowestDenomination
      ).toCurrencyValue();

    productInput.price = newCurrencyValue(productInput.price);
    if (productInput.compareAtprice) {
      productInput.compareAtprice = newCurrencyValue(
        productInput.compareAtprice
      );
    }
    if (productInput.costPerItem) {
      productInput.costPerItem = newCurrencyValue(productInput.costPerItem);
    }

    const productId = await super.save(productInput);
    await this.productCategoriesSave(productId, categoryIds);
    await this.productImagesSave(productId, images);
    await this.productInventoriesSave(productId, inventories);
    await this.productReturnPolicySave(productId, returnPolicy);
    return productId;
  }

  async validate(input) {
    const errors = [];
    if (input.categoryIds.length === 0) {
      errors.push(storeOrderProductSaveError.PRODUCT_HAS_MINIMUN_ONE_CATEGORY);
    } else {
      const categoryIds = uniq(input.categoryIds);
      const categoryNumber = await this.roDb('categories')
        .select(this.roDb.raw('count(id)'))
        .whereIn('id', categoryIds).first();
      if (categoryIds.length != categoryNumber.count) {
        errors.push(storeOrderProductSaveError.INVALID_CATEGORY_ID);
      }
    }

    if (errors.length === 0) {
      const {countryId} = await this.db('brands').select('country_id').where('id', input.brandId).first();
      const categoryCountriesList = await this.db('categories_countries').select('*').whereIn('category_id', input.categoryIds);
      for (const categoryId of input.categoryIds) {
        const tempListByCategoryId = filter(categoryCountriesList, a => a.categoryId === categoryId);
        if (tempListByCategoryId.length > 0) {
          if (findIndex(tempListByCategoryId, b => b.countryId === countryId) < 0) {
            errors.push(storeOrderProductSaveError.BRAND_COUNTRY_NOT_MATCHED_CATEGORY_COUNTRY);
            break;
          }
        }
      }

      if (input.cashOnDelivery && input.status === 'ACTIVE') {
        const cashOnDeliveryProducts = await this.db(this.tableName)
          .select('products.id', 'brands.country_id')
          .leftJoin('brands', 'brands.id', `${this.tableName}.brand_id`)
          .where('products.status', 'ACTIVE')
          .where('products.cash_on_delivery', true);
        const cashProduct = find(cashOnDeliveryProducts, countryId);
        if (cashProduct && (!input.id || input.id !== cashProduct.id)) {
          errors.push(storeOrderProductSaveError.MULTIPLE_CASH_PRODUCT);
        }
      }
    }
    return errors;
  }

  async getAllProductDetails(brandId) {
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
      where p.status = ? and p.brand_id = ?
    `;
    const queryInputs = ['ACTIVE', brandId];
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
    return products;
  }
}

module.exports = Product;
