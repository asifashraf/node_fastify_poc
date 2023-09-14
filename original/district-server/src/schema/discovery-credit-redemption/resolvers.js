const { addLocalizationField } = require('../../lib/util');

module.exports = {
  DiscoveryCreditRedemption: {
    async brand({ brandId }, args, context) {
      return addLocalizationField(await context.brand.getById(brandId), 'name');
    },
    discoveryCredit({ discoveryCreditId }, args, context) {
      return context.discoveryCredit.getById(discoveryCreditId);
    },
  },
};
