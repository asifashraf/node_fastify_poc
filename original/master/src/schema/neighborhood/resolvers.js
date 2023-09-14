const { addLocalizationField } = require('../../lib/util');

module.exports = {
  Neighborhood: {
    async city({ cityId }, args, context) {
      if (!cityId) {
        return null;
      }
      return addLocalizationField(await context.city.getById(cityId), 'name');
    },
  },
};
