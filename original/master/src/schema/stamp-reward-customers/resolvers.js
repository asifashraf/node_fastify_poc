const { stampReward} = require('../../../config')
const { stampRewardCustomerError } = require('./enums');
const { formatError, addLocalizationField } = require('../../lib/util');

module.exports = {
  Query: {
    getStampRewardConfig(_, args, context){
      const stampRewardConfig = {
        status: stampReward.enable,
        counterMaxValue: stampReward.counterMaxValue,
        autoApply: stampReward.autoApply,
        priceOperatorToApply: stampReward.priceOperatorToApply,
        priceRuleMinValueToApply: stampReward.priceRuleMinValueToApply,
        priceRuleMaxValueToApply: stampReward.priceRuleMaxValueToApply,
      }
      return stampRewardConfig;
    },
    async getCustomerStampReward(_, args, context){
      const customerId = context.auth.id;
      const customer = await context.customer.getById(customerId);
      if(customer){
        if(context.stampRewardCustomer.isProgramValid()){
          const stampReward = await context.stampRewardCustomer.getByCustomerId(customerId);
          return {stampReward}
        }else return formatError(
          [stampRewardCustomerError.PROGRAM_DISABLE],
        );
      }else return formatError(
        [stampRewardCustomerError.INVALID_CUSTOMER],
      );
    }
  },
  Mutation: {
    async refundStampReward(root, { customerId, orderSetId }, context){
      const auth = context.auth;
      const admin = await context.admin.getByAuthoId(auth.id);
      if (admin && !context.auth.isVendorAdmin) {
        return context.stampRewardCustomer.refundStampRewardPerk({customerId, orderSetId});
      }
      return formatError(
        [stampRewardCustomerError.UNAUTHORIZED_PROCESS],
      );
    },
    async updateCustomerStampReward(root, { customerId, orderSetId, process }, context){
      const auth = context.auth;
      const admin = await context.admin.getByAuthoId(auth.id);
      if (admin && !context.auth.isVendorAdmin) {
        return context.stampRewardCustomer.updateCustomerStampReward({customerId, orderSetId, process, adminId: admin.id});
      }
      return formatError(
        [stampRewardCustomerError.UNAUTHORIZED_PROCESS],
      );
    },
  },
  StampRewardCustomer: {
    customer({ customerId }, args, context) {
      return context.customer.getById(customerId);
    },
    counterMaxValue(_, args, context) {
      return stampReward.counterMaxValue;
    },
    counterValue({counterValue}, args, context) {
      if(!counterValue) counterValue = 0;
      return counterValue;
    },
    claimStatus({claimStatus}, args, context) {
      if(!claimStatus) claimStatus = false;
      return claimStatus;
    },
  },
};
