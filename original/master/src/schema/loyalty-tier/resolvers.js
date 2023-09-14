const { addLocalizationField } = require('../../lib/util');
const { isNumber, toNumber } = require('lodash');
const SlackWebHookManager = require('../slack-webhook-manager/slack-webhook-manager');

module.exports = {
  LoyaltyTier: {
    // seems is not used anymore / legacy compat
    benefits() {
      return [];
    },
    async country({ countryId }, args, context) {
      return addLocalizationField(
        await context.country.getById(countryId),
        'name'
      );
    },
    async currency({ currencyId }, args, context) {
      return addLocalizationField(
        addLocalizationField(
          await context.currency.getById(currencyId),
          'symbol'
        ),
        'subunitName'
      );
    },
  },
  LoyaltyTierWallet: {
    async bonus(root, args, context) {
      const isNumberX = isNumber(toNumber(root?.bonus));
      if (!isNumberX) {
        SlackWebHookManager.sendTextToSlack(
          'Bonus is NaN, Examine it ' +
          JSON.stringify(root),
        );
      }
      return isNumberX ? root?.bonus : 0;
    },
  }
};
