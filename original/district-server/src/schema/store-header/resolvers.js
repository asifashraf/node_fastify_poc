const { addLocalizationField } = require('../../lib/util');
module.exports = {
  StoreHeader: {
    async country({ countryId }, args, context) {
      return addLocalizationField(
        await context.country.getById(countryId),
        'name'
      );
    },
  },
};
