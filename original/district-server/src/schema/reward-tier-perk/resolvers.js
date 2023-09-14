const { addLocalizationField, addLocalizationMultipleFields } = require('../../lib/util');
module.exports = {
  RewardTierPerk: {
    async rewardTier({ rewardTierId }, args, context) {
      return addLocalizationField(
        await context.rewardTier.getById(rewardTierId),
        'title'
      );
    },
    async menuItem({menuItemId}, args, context) {
      return addLocalizationMultipleFields(
        await context.menuItem.getById(menuItemId),
        ['name', 'itemDescription']
      );
    },
  },
};
