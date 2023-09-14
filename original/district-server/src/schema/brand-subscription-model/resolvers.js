const { addLocalizationField } = require('../../lib/util');

module.exports = {
  BrandSubscriptionModel: {
    async brand({ brandId }, args, context) {
      return addLocalizationField(await context.brand.getById(brandId), 'name');
    },
    async country({ countryId }, args, context) {
      return addLocalizationField(
        await context.country.getById(countryId),
        'name'
      );
    },
    async currency({ currencyId }, args, context) {
      return addLocalizationField(
        addLocalizationField(
          await context.currency.getById(currencyId),
          'symbol'
        ),
        'subunitName'
      );
    },
  },
};
