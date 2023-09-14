/* const {
  formatError,
  addLocalizationField
} = require('../../lib/util');

module.exports = {
  Mutation: {
    async saveCSubscriptionBrand(
      root,
      { subscription },
      context
    ) {
      const errors = await context.cSubscriptionBrand.validateInput(subscription);
      if (errors.length > 0) {
        return formatError(errors, subscription);
      }
      const formattedData = await context.cSubscriptionBrand.formatData(subscription);
      const id = await context.cSubscriptionBrand.save(formattedData);
      const subBrands = await context.cSubscriptionBrand.getById(id);
      return { errors: null, subscription: !subBrands.length ? [subBrands] : subBrands };
    },
  },
  Query: {
    async getCSubscriptionBrandsByFilters(
      root,
      { paging, filters },
      context
    ) {
      return context.cSubscriptionBrand.getQueryByFilters(filters, paging);
    },
  },
  CSubscriptionBrand: {
    async brand({ brandId }, args, context) {
      const brand = await context.brand.getById(brandId);
      return addLocalizationField(brand, 'name');
    }
  },
};
 */
