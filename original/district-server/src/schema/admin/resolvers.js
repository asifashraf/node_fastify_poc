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
  Mutation: {
    async adminLogin(root, { loginDetails }, context) {
      const data = await context.adminLogin.initiateLogin(loginDetails);
      const accountInfo = await context.adminLogin.getAccountInfo(data);
      return accountInfo;
    },
  }
};
