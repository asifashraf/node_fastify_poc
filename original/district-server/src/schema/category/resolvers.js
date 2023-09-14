const {
  formatError,
  addLocalizationField,
} = require('../../lib/util');

module.exports = {
  Category: {
    async productsInCountry({ id }, { countryCode }, context) {
      return context.category.getAllProductsInCountry(id, countryCode);
    },
    async products({ id, products }, args, context) {
      if (products) {
        // products comes from catalog with products already fetched
        return products;
      }
      return context.category.getAllProducts(id);
    },
    async productsInCountryByCountryId({ id }, { countryId }, context) {
      return context.category.getAllProductsInCountryByCountryId(id, countryId);
    },
    async countries({id}, args, context) {
      return context.category.loaders.countries.load(id);
    }
  },
  CategoryNew: {
    async productsInCountry({ id }, { countryId }, context) {
      if (countryId) {
        return context.category.getAllProductsInCountryNew(id, countryId);
      } else {
        return [];
      }
    },
  },
  Mutation: {
    async categorySave(root, { input }, context) {
      const validationResult = await context.category.validate(input);
      if (validationResult.length > 0) {
        return formatError(validationResult, input);
      }
      const result = await context.withTransaction('category', 'save', input);
      if (result.error) {
        return formatError(result, input);
      }
      const category = await context.category.getById(result);
      return {
        category: addLocalizationField(category, 'name'),
      };
    },
    async categoriesSorting(root, { ids }, context) {
      const response = await context.withTransaction(
        'category',
        'sortCategories',
        ids
      );
      return response;
    },
  },
  Query: {
    async categories(
      root,
      { filters = { status: 'ALL' }, paging },
      context
    ) {
      // this query returns public information
      return context.category.getAllPaged(paging, filters);
    },
    async category(root, { id }, context) {
      return addLocalizationField(await context.category.getById(id), 'name');
    },
    async categoryNew(root, { id }, context) {
      return addLocalizationField(await context.category.getById(id), 'name');
    },
  }
};
