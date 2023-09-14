const { formatError } = require('../../lib/util');
const { stampRewardLogType } = require('../stamp-reward-logs/enums')

module.exports = {
  Query: {
    getEligibleItems(_, args, context){
      return context.stampRewardEligibleItem.getEligibleItems(true);
    },
    async getEligibleItemsForAdmin(_, args, context){
      const admin = await context.admin.getByAuthoId(context.auth.id);
      return context.stampRewardEligibleItem.getEligibleItems(!admin);
    }
  },
  Mutation: {
    async saveEligibleItem(_, {input}, context){
      const validationResult = await context.stampRewardEligibleItem.validateEligibleItems(input);
      if (validationResult.length > 0){
        return formatError(validationResult);
      }

      const response = await context.stampRewardEligibleItem.saveEligibleItems(input);
      if(response?.errors){
        return formatError(response.errors);
      }
      const items = await context.stampRewardEligibleItem.getEligibleItems(false)
      await context.stampRewardLog.saveStampRewardLog({
        logType: stampRewardLogType.ELIGIBLE_ITEMS_UPDATE,
        request: JSON.stringify(input),
        response: JSON.stringify(items)
      })
      return {items};
    }
  }
};
