const { addLocalizationField } = require('../../lib/util');
const { statusTypes } = require('./../root/enums');

module.exports = {
  City: {
    async country({ countryId }, args, context) {
      return addLocalizationField(
        await context.country.getById(countryId),
        'name'
      );
    },
    async neighborhoods(
      { id },
      { filters = { status: statusTypes.ACTIVE } },
      context
    ) {
      return addLocalizationField(
        await context.neighborhood.getByCity(id, filters),
        'name'
      );
    },
  },
};
