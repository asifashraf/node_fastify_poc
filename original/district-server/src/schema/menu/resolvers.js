const { addLocalizationField } = require('../../lib/util');
module.exports = {
  Menu: {
    async brand({ brandId }, args, context) {
      return addLocalizationField(await context.brand.getById(brandId), 'name');
    },
    async country({ countryId }, args, context) {
      return addLocalizationField(
        await context.country.getById(countryId),
        'name'
      );
    },
    async sections({ id }, args, context) {
      return addLocalizationField(
        await context.menuSection.getByMenu(id),
        'name'
      );
    },
  },
};
