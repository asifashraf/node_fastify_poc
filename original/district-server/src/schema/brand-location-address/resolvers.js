const { addLocalizationField } = require('../../lib/util');

module.exports = {
  BrandLocationAddress: {
    async city({ cityId }, args, context) {
      return addLocalizationField(await context.city.getById(cityId), 'name');
    },
    async neighborhood({ neighborhoodId }, args, context) {
      return addLocalizationField(
        await context.neighborhood.getById(neighborhoodId),
        'name'
      );
    },
  },
};
