const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');
const { uuid } = require('../../lib/util');
const { stampRewardLogType} = require('./enums');
const { omit } = require('lodash');

class StampRewardLog extends BaseModel {
  constructor(db, context) {
    super(db, 'stamp_reward_logs', context);
    this.loaders = createLoaders(this);
  }

  async saveStampRewardLog(input){
    return await this.context.db.transaction(async trx => {
      switch (input.logType ) {
        case stampRewardLogType.CREATE_ORDER_WITH_ELIGIBLE_ITEM: 
          input.referenceAdminId = null;
          break;
        case stampRewardLogType.CREATE_ORDER_WITH_REDEMPTION_ITEM:
          if(input.portalType == 'MPOS'){
            input.request = JSON.stringify({'clientName':'MPOS'})
          }else {
            input.request = JSON.stringify({'clientName':'PORTAL'})
            const admin = await this.context.admin.getByAuthoId(this.context.auth.id);
            input.referenceAdminId = admin.id;
          }
          input = omit(input, ['portalType'])
          break;   
        case stampRewardLogType.ELIGIBLE_ITEMS_UPDATE:
        case stampRewardLogType.REDEMPTION_ITEMS_UPDATE:
        case stampRewardLogType.REFUND_STAMP_REWARD_PERK:  
          const admin = await this.context.admin.getByAuthoId(this.context.auth.id);
          input.referenceAdminId = admin.id;
          break;
      }
      await trx(this.tableName)
        .insert({
          id: uuid.get(),
          ...input,
        });
    }).catch(async error => {
      console.log(error);
    });
  }

  async isClaimOrder(customerId, orderSetId){
    const [{count}] = await this.db.table(this.tableName)
      .count('*')
      .where('reference_customer_id', customerId)
      .andWhere('reference_order_id', orderSetId)
      .andWhere('log_type', stampRewardLogType.CREATE_ORDER_WITH_ELIGIBLE_ITEM);
    return count > 0;  
  }

  async isRefundedOrder(customerId, orderSetId){
    const [{count}] = await this.db.table(this.tableName)
      .count('*')
      .where('reference_customer_id', customerId)
      .andWhere('reference_order_id', orderSetId)
      .andWhere('log_type', stampRewardLogType.REFUND_STAMP_REWARD_PERK);
    return count > 0;  
  }

  async isRedemptionOrder(customerId, orderSetId){
    const [{count}] = await this.db.table(this.tableName)
      .count('*')
      .where('reference_customer_id', customerId)
      .andWhere('reference_order_id', orderSetId)
      .andWhere('log_type', stampRewardLogType.CREATE_ORDER_WITH_REDEMPTION_ITEM);
    return count > 0;  
  }

  async isRemoveStampOrder(customerId, orderSetId){
    const [{count}] = await this.db.table(this.tableName)
      .count('*')
      .where('reference_customer_id', customerId)
      .andWhere('reference_order_id', orderSetId)
      .andWhere('log_type', stampRewardLogType.REMOVE_STAMP_WITH_REDEMPTION_ITEM);
    return count > 0;  
  }

}

module.exports = StampRewardLog;
