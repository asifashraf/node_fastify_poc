const { addLocalizationField } = require('../../lib/util');
module.exports = {
  Reward: {
    async brand({ brandId }, args, context) {
      return addLocalizationField(await context.brand.getById(brandId), 'name');
    },
    async childBrands({ id }, args, context) {
      return addLocalizationField(await context.reward.childBrands(id), 'name');
    },
    async tiers({ id }, args, context) {
      return addLocalizationField(
        await context.rewardTier.getAllByRewardId(id),
        'title'
      );
    },
  },
};
