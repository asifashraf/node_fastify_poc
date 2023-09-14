const { addLocalizationField } = require('../../lib/util');

module.exports = {
  PickupLocation: {
    async brand({ brandId }, args, context) {
      return addLocalizationField(await context.brand.getById(brandId), 'name');
    },
    async neighborhood({ neighborhoodId }, args, context) {
      return addLocalizationField(
        await context.neighborhood.getById(neighborhoodId),
        'name'
      );
    },
    async city({ cityId }, args, context) {
      return addLocalizationField(await context.city.getById(cityId), 'name');
    },
  },
};
