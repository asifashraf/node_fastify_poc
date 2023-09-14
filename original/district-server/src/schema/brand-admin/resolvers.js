const { addLocalizationField } = require('../../lib/util');

module.exports = {
  BrandAdmin: {
    admin({ adminId }, args, context) {
      return context.admin.getById(adminId);
    },
    async brand({ brandId }, args, context) {
      return addLocalizationField(await context.brand.getById(brandId), 'name');
    },
    async brandLocation({ brandLocationId }, args, context) {
      return addLocalizationField(
        await context.brandLocation.getById(brandLocationId),
        'name'
      );
    },
  },
};
