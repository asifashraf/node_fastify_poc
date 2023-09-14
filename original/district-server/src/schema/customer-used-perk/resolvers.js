const { addLocalizationField } = require('../../lib/util');
const { rewardTierPerkType } = require('./../root/enums');

module.exports = {
  CustomerUsedPerk: {
    async items(root, args, context) {
      return addLocalizationField(
        await context.customerUsedPerk.getItemsForUsedPerk(root),
        'name'
      );
    },
    orderSet({ orderSetId }, args, context) {
      return context.orderSet.getById(orderSetId);
    },
    async amount({ orderSetId, total, type }, args, context) {
      if (type === rewardTierPerkType.DISCOUNT) {
        const { subtotal } = await context.orderSet.getById(orderSetId);
        return parseFloat(subtotal) * (total / 100);
      }
      return 0;
    },
    async brandLocation({ orderSetId }, args, context) {
      const orderSet = await context.orderSet.getById(orderSetId);
      return addLocalizationField(
        await context.brandLocation.getById(orderSet.brandLocationId),
        'name'
      );
    },
  },
};
