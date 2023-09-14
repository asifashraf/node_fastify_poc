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
};
