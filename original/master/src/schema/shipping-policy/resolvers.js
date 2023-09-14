const { addLocalizationField } = require('../../lib/util');

module.exports = {
  ShippingPolicy: {
    async country({ countryId }, args, context) {
      return addLocalizationField(
        await context.country.getById(countryId),
        'name'
      );
    },
    async currency({ id }, params, context) {
      return addLocalizationField(
        addLocalizationField(
          await context.shippingPolicy.getCurrency(id),
          'symbol'
        ),
        'subunitName'
      );
    },
  },
};
