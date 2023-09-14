const { formatError } = require('../../lib/util');
const { stampRewardLogType } = require('../stamp-reward-logs/enums')

module.exports = {
  Query: {
    getRedemptionItems(_, args, context){
      return context.stampRewardRedemptionItem.getRedemptionItems(true);
    },
    async getRedemptionItemsForAdmin(_, args, context){
      const admin = await context.admin.getByAuthoId(context.auth.id);
      return context.stampRewardRedemptionItem.getRedemptionItems(!admin);
    }
  },
  Mutation: {
    async saveRedemptionItem(_, {input}, context){
      const validationResult = await context.stampRewardRedemptionItem.validateRedemptionItems(input);
      if (validationResult.length > 0){
        return formatError(validationResult);
      }

      const response = await context.stampRewardRedemptionItem.saveRedemptionItems(input);
      if(response?.errors){
        return formatError(response.errors);
      }
      const items = await context.stampRewardRedemptionItem.getRedemptionItems(false)
      await context.stampRewardLog.saveStampRewardLog({
        logType: stampRewardLogType.REDEMPTION_ITEMS_UPDATE,
        request: JSON.stringify(input), 
        response: JSON.stringify(items)
      })
      return {items};
    }
  }
};
