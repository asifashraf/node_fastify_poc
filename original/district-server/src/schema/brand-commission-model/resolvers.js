const { addLocalizationField } = require('../../lib/util');

module.exports = {
  BrandCommissionModel: {
    async brand({ brandId }, args, context) {
      return addLocalizationField(await context.brand.getById(brandId), 'name');
    },
  },
};
