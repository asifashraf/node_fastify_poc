const { addLocalizationField } = require('../../lib/util');
module.exports = {
  RewardTier: {
    async reward({ rewardId }, args, context) {
      return addLocalizationField(
        addLocalizationField(await context.reward.getById(rewardId), 'title'),
        'conversionName'
      );
    },
    allowedPerks({ id }, args, context) {
      return context.rewardTierPerk.rewardTierAllowedPerks(id);
    },
    async perks({ id }, args, context) {
      return addLocalizationField(
        await context.rewardTierPerk.getAllByRewardTierId(id),
        'title'
      );
    },
  },
};
