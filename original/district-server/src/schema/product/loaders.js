const DataLoader = require('dataloader');
const { groupBy, map, first } = require('lodash');

const { addLocalizationField } = require('../../lib/util');

function createLoaders(model) {
  return {
    currency: new DataLoader(async productIds => {
      const currencies = groupBy(
        addLocalizationField(
          await model
            .db('currencies')
            .join('countries', 'countries.currency_id', 'currencies.id')
            .join('brands', 'brands.country_id', 'countries.id')
            .join('products', 'products.brand_id', 'brands.id')
            .select('currencies.*', 'products.id as product_ids')
            .whereIn('products.id', productIds),
          'symbol'
        ),
        'productIds'
      );
      return map(productIds, productId =>
        (currencies[productId] ? currencies[productId][0] : null)
      );
    }),
    categoryIds: new DataLoader(async productIds => {
      const categoryIds = groupBy(
        await model.db('products_categories').whereIn('product_id', productIds),
        'productId'
      );
      return map(productIds, productId =>
        (categoryIds[productId] ? categoryIds[productId] : null)
      );
    }),
    inventories: new DataLoader(async productIds => {
      const stocks = await model
        .db('inventories')
        .whereIn('product_id', productIds);
      return map(productIds, productId =>
        stocks.filter(stock => stock.productId === productId)
      );
    }),
    images: new DataLoader(async productIds => {
      const iamges = await model
        .db('product_images')
        .whereIn('product_id', productIds);
      return map(productIds, productId =>
        iamges.filter(image => image.productId === productId)
      );
    }),
    returnPolicy: new DataLoader(async productIds => {
      const returnPolicy = await model
        .db('return_policies')
        .whereIn('product_id', productIds);
      return map(productIds, productId =>
        first(returnPolicy.filter(stock => stock.productId === productId))
      );
    }),
  };
}

module.exports = { createLoaders };
