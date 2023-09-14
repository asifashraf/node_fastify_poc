const { map, includes, uniq } = require('lodash');

// const BaseModel = require('../../base-model');
const { statusTypes } = require('../root/enums');
const { addLocalizationField } = require('../../lib/util');

class ProductsCatalog {
  constructor(db, context) {
    this.context = context;
    this.db = db;
  }

  async getCatalog(brandId) {
    const brand = await this.context.brand.getById(brandId);
    const country = await this.context.country.getById(brand.countryId);
    const currency = await this.context.currency.getById(country.currencyId);

    const products = map(
      await this.context.product.getAll({ brandIds: [brandId] }),
      product => {
        product.currency = addLocalizationField(
          addLocalizationField(currency, 'symbol'),
          'subunitName'
        );
        return product;
      }
    );
    const productIds = map(products, product => product.id);

    const productsCategories = await this.db('products_categories').whereIn(
      'product_id',
      productIds
    );
    const categoryIds = uniq(map(productsCategories, p => p.categoryId));
    let categories = await this.context.category
      .getAll({ status: statusTypes.ACTIVE })
      .whereIn('id', categoryIds);

    categories = map(categories, category => {
      // get productIds in category.id from products_categories
      const _productIds = uniq(
        map(
          productsCategories.filter(
            productCategory => productCategory.categoryId === category.id
          ),
          productCategory => productCategory.productId
        )
      );
      // filter only the products in this category
      category.products = addLocalizationField(
        addLocalizationField(
          products.filter(product => includes(_productIds, product.id)),
          'name'
        ),
        'description'
      );
      return addLocalizationField(category, 'name');
    });

    return {
      country,
      categories,
    };
  }

  async getCatalogNew(brandId) {
    const brand = addLocalizationField(
      await this.context.brand.getById(brandId),
      'name'
    );

    const products = await this.context.product.getAllProductDetails(brandId);
    // const products = await this.context.product.getAll({ brandIds: [brandId] });
    const productIds = map(products, product => product.id);

    const productsCategories = await this.db('products_categories').whereIn(
      'product_id',
      productIds
    );
    const categoryIds = uniq(map(productsCategories, p => p.categoryId));
    let categories = await this.context.category
      .getAll({ status: statusTypes.ACTIVE })
      .whereIn('id', categoryIds);

    categories = map(categories, category => {
      // get productIds in category.id from products_categories
      const _productIds = uniq(
        map(
          productsCategories.filter(
            productCategory => productCategory.categoryId === category.id
          ),
          productCategory => productCategory.productId
        )
      );
      // filter only the products in this category
      category.products = addLocalizationField(
        addLocalizationField(
          _productIds.map(_productId => products.find(product => product.id == _productId)),
          'name'
        ),
        'description'
      );
      return addLocalizationField(category, 'name');
    });
    return {
      categories,
      brand,
    };
  }
}

module.exports = ProductsCatalog;
