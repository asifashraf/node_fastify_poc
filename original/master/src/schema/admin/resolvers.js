const { addLocalizationField } = require('../../lib/util');

module.exports = {
  Admin: {
    async forBrands({ id }, { brandId }, context) {
      return context.brandAdmin.getByAdminId(id, brandId);
    },
    async groups({ id }, args, context) {
      return context.groupAdmin.getByAdminId(id);
    },
    async brand({ id }, args, context) {
      return addLocalizationField(
        await context.brandAdmin.getAdminBrand(id),
        'name'
      );
    },
    async brandLocation({ id }, args, context) {
      return addLocalizationField(
        await context.brandAdmin.getAdminBrandLocation(id),
        'name'
      );
    },
  },
};
