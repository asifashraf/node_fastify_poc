const { addLocalizationField } = require('../../lib/util');
module.exports = {
  RewardTierPerk: {
    async rewardTier({ rewardTierId }, args, context) {
      return addLocalizationField(
        await context.rewardTier.getById(rewardTierId),
        'title'
      );
    },
  },
};
