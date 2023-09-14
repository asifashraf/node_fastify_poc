const { addLocalizationField } = require('../../lib/util');

module.exports = {
  Product: {
    async brand({ brandId }, args, context) {
      return addLocalizationField(await context.brand.getById(brandId), 'name');
    },
    async categories({ id }, params, context) {
      return addLocalizationField(
        await context.product.getCategories(id),
        'name'
      );
    },
    async images({ id }, params, context) {
      return context.product.getImages(id);
    },
    async stock({ id }, params, context) {
      return context.product.getStock(id);
    },
    async currency({ id }, params, context) {
      return addLocalizationField(
        addLocalizationField(await context.product.getCurrency(id), 'symbol'),
        'subunitName'
      );
    },
    async inventories({ id }, params, context) {
      return context.product.getInventories(id);
    },
    async returnPolicy({ id }, params, context) {
      return addLocalizationField(
        await context.product.getReturnPolicy(id),
        'description'
      );
    },
    compareAtPrice({ compareAtPrice }) {
      if (compareAtPrice === 'NaN') {
        return null;
      }
      return compareAtPrice;
    },
  },
  ProductNew: {
    async brand({ brandId }, args, context) {
      return addLocalizationField(await context.brand.getById(brandId), 'name');
    },
    async categories({ id }, params, context) {
      return addLocalizationField(
        await context.product.getCategories(id),
        'name'
      );
    },
    async images({ id }, params, context) {
      return context.product.getImages(id);
    },
    async stock({ id }, params, context) {
      return context.product.getStock(id);
    },
    async currency({ id }, params, context) {
      return addLocalizationField(
        addLocalizationField(await context.product.getCurrency(id), 'symbol'),
        'subunitName'
      );
    },
    async inventories({ id }, params, context) {
      return context.product.getInventories(id);
    },
    async returnPolicy({ id }, params, context) {
      return addLocalizationField(
        await context.product.getReturnPolicy(id),
        'description'
      );
    },
    compareAtPrice({ compareAtPrice }) {
      if (compareAtPrice === 'NaN') {
        return null;
      }
      return compareAtPrice;
    },
  },
};
