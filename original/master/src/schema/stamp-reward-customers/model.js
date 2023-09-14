const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');
const { stampReward: stampRewardConfig } = require('../../../config');
const { stampRewardStatus, stampRewardCustomerError, stampRewardProcessTypes } = require('./enums');
const { stampRewardLogType } = require('../stamp-reward-logs/enums');
const { uuid, formatError } = require('../../lib/util');

class StampRewardCustomer extends BaseModel {
  constructor(db, context) {
    super(db, 'stamp_reward_customers', context);
    this.loaders = createLoaders(this);
  }

  async getByCustomerId(customerId){
    const customerStampProgram = await this.db.table(this.tableName)
     .where('customer_id', customerId)
     .first();
    if(!customerStampProgram) {
      return {
        customerId
      }
    }
    return customerStampProgram; 
  }

  async customerHasStampReward(customerId){
    const customerStampProgram = await this.db.table(this.tableName)
     .where('customer_id', customerId)
     .first();
    return customerStampProgram?.claimStatus || false; 
  }

  /**
   * When On/Off or Multiple Stamp programs are developed
   * we can move this function
   */
  async isProgramValid(){
    if(stampRewardConfig && stampRewardConfig?.enable == stampRewardStatus.ENABLE && stampRewardConfig?.counterMaxValue > 0){
      return true;
    }
    /**
     * Maybe we should add log or some alert for invalid case
     * Especially, when the program is enabled but somehow other values are inconsistent
     * => Counter max value undefined or less than 1
     * => Eligible item/s are undefined
     * => Redemption item/s are undefined
     */
    return false;
  }

  async claimStampReward({customerId, orderSetId, brandLocationId, stampRewardInfo, currencyId}){
    await this.db.table(this.tableName)
      .update({counterValue: 0, claimStatus: false})
      .where('customer_id', customerId);
    const input = {
      brandLocationId,
      item: stampRewardInfo.item,
      amount: stampRewardInfo.amount,
      currencyId,
    }

    await this.context.stampRewardLog.saveStampRewardLog({
      logType: stampRewardLogType.CREATE_ORDER_WITH_ELIGIBLE_ITEM,
      referenceOrderId: orderSetId,
      referenceCustomerId: customerId,
      request: JSON.stringify(input),
      response: null
    })  
  }

  async checkAndUpdateCustomerStampReward(customerId, orderSetId, portalType){
    if(stampRewardConfig && stampRewardConfig?.enable == stampRewardStatus.ENABLE){
      const isClaimOrder = await this.context.stampRewardLog.isClaimOrder(customerId, orderSetId);
      if(!isClaimOrder){
        const orderRedemptionItemCount = await this.context.stampRewardRedemptionItem.getOrderRedemptionItemCount(orderSetId);
        if(orderRedemptionItemCount > 0){
          let shouldRedemption = false;
          const customerStampProgram = await this.db.table(this.tableName)
            .where('customer_id', customerId)
            .first();
          if(!customerStampProgram){
            await this.db.table(this.tableName)
            .insert({
              id: uuid.get(),
              customerId,
              counterValue: orderRedemptionItemCount > stampRewardConfig.counterMaxValue? stampRewardConfig.counterMaxValue: orderRedemptionItemCount,
              claimStatus: (orderRedemptionItemCount >= stampRewardConfig.counterMaxValue)
            });
            shouldRedemption = true;
          }else if(!customerStampProgram.claimStatus){
            const newCounterValue = customerStampProgram.counterValue + orderRedemptionItemCount
            const input = {
              counterValue: newCounterValue >= stampRewardConfig.counterMaxValue ? stampRewardConfig.counterMaxValue: newCounterValue,
              claimStatus: (newCounterValue >= stampRewardConfig.counterMaxValue)
            }
            await this.db.table(this.tableName)
              .update(input)
              .where('customer_id', customerId);
            shouldRedemption = true;
          }
          if(shouldRedemption){
            await this.context.stampRewardLog.saveStampRewardLog({
              logType: stampRewardLogType.CREATE_ORDER_WITH_REDEMPTION_ITEM,
              referenceOrderId: orderSetId,
              referenceCustomerId: customerId,
              portalType,
              request: null,
              response: null
            })
            return true; 
          } 
        }
      }
    }
    return false;
  }

  async refundStampRewardPerk({customerId, orderSetId}){
    if(!this.isProgramValid){
      return formatError([stampRewardCustomerError.PROGRAM_DISABLE],)
    }
    const orderSet = await this.context.orderSet.getById(orderSetId);
    if(orderSet && orderSet.customerId == customerId){
      const isRefundedOrder = await this.context.stampRewardLog.isRefundedOrder(customerId, orderSetId);
      if(isRefundedOrder){
        return formatError([stampRewardCustomerError.STAMP_REWARD_ALREADY_REFUND],)
      }
      const isClaimOrder = await this.context.stampRewardLog.isClaimOrder(customerId, orderSetId);
      if(isClaimOrder){
        await this.db.table(this.tableName)
          .update({ claimStatus: true})
          .where('customer_id', customerId); 

        await this.context.stampRewardLog.saveStampRewardLog({
          logType: stampRewardLogType.REFUND_STAMP_REWARD_PERK,
          referenceOrderId: orderSetId,
          referenceCustomerId: customerId,
          request: null,
          response: null
        })
        return { stampReward: await this.getByCustomerId(customerId) }; 
      } else return formatError([stampRewardCustomerError.INVALID_ORDER],)
    }else {
      return formatError([stampRewardCustomerError.INVALID_ORDER],)
    } 
  }

  async updateCustomerStampReward({customerId, orderSetId, process, adminId}){
    if(!this.isProgramValid){
      return formatError([stampRewardCustomerError.PROGRAM_DISABLE],)
    }
    const orderSet = await this.context.orderSet.getById(orderSetId);
    const promises = [];
    if(orderSet && orderSet.customerId == customerId){
      const isRedemptionOrder = await this.context.stampRewardLog.isRedemptionOrder(customerId, orderSetId);
      if(process == stampRewardProcessTypes.ADD){
        const orderRedemptionItemCount = await this.context.stampRewardRedemptionItem.getOrderRedemptionItemCount(orderSetId);
        if(orderRedemptionItemCount < 1){
          return formatError([stampRewardCustomerError.ORDER_HAS_NOT_REDEMPTION_ITEMS],)
        }else if(isRedemptionOrder){ 
          return formatError([stampRewardCustomerError.ORDER_IS_ALREADY_ADDED_TO_REDEMPTION_LIST],)
        }
      }else {
        if(isRedemptionOrder){
          const isRemoveStampOrder = await this.context.stampRewardLog.isRemoveStampOrder(customerId, orderSetId);
            if(isRemoveStampOrder){
              return formatError([stampRewardCustomerError.STAMP_IS_ALREADY_REMOVED_REDEMPTION_ORDER_LIST],)
            }
        }else{
          return formatError([stampRewardCustomerError.ORDER_CAN_NOT_FOUND_REDEMPTION_ORDER_LIST],)
        } 
      }
      const customerStampReward = await this.getByCustomerId(customerId);
      if(customerStampReward){
        if(process == stampRewardProcessTypes.ADD){
          if(customerStampReward.claimStatus){
            return formatError([stampRewardCustomerError.CUSTOMER_ALREADY_HAS_MAX_STAMP_COUNT],)
          }else if(customerStampReward.counterValue >= stampRewardConfig.counterMaxValue) {
            // TODO: Add log, inconsistent data, counter value is bigger or equal counter max value 
            // But claim status false   
            await this.db.table(this.tableName)
              .update({ counterValue: stampRewardConfig.counterMaxValue, claimStatus: true})
              .where('customer_id', customerId); 
            return formatError([stampRewardCustomerError.CUSTOMER_ALREADY_HAS_MAX_STAMP_COUNT],)
          }else {
            const input = {
              counterValue: customerStampReward.counterValue + 1,
              claimStatus: (customerStampReward.counterValue + 1) >= stampRewardConfig.counterMaxValue
            }
            promises.push(this.db.table(this.tableName)
              .update(input)
              .where('customer_id', customerId));
            const logInput = {
              id: uuid.get(),
              logType: stampRewardLogType.CREATE_ORDER_WITH_REDEMPTION_ITEM,
              referenceOrderId: orderSetId,
              referenceCustomerId: customerId,
              referenceAdminId: adminId,
              request: JSON.stringify(input),
              response: null
            }
            promises.push(this.db.table(this.context.stampRewardLog.tableName)
              .insert(logInput));
            //return { process, stampReward: await this.getByCustomerId(customerId) };   
          }
        }else {
          if(customerStampReward.counterValue < 0 ){
            // TODO: Add log, inconsistent data, counter value can not be less than 0  
            await this.db.table(this.tableName)
              .update({ counterValue: 0, claimStatus: false})
              .where('customer_id', customerId);  
            return formatError([stampRewardCustomerError.CUSTOMER_HAS_NOT_STAMP_FOR_REMOVE_PROCESS],)  
          }else if(customerStampReward.counterValue == 0){
            return formatError([stampRewardCustomerError.CUSTOMER_HAS_NOT_STAMP_FOR_REMOVE_PROCESS],)
          }else {
            const input = {
              counterValue: customerStampReward.counterValue - 1,
              claimStatus: (customerStampReward.counterValue - 1) >= stampRewardConfig.counterMaxValue
            }
            promises.push(this.db.table(this.tableName)
              .update(input)
              .where('customer_id', customerId)); 
            const logInput = {
              id: uuid.get(),
              logType: stampRewardLogType.REMOVE_STAMP_WITH_REDEMPTION_ITEM,
              referenceOrderId: orderSetId,
              referenceCustomerId: customerId,
              referenceAdminId: adminId,
              request:  JSON.stringify(input),
              response: null
            }
            promises.push(this.db.table(this.context.stampRewardLog.tableName)
              .insert(logInput));
            // return { process, stampReward: await this.getByCustomerId(customerId) };      
          }
        }  
      } else {
        if(process == stampRewardProcessTypes.REMOVE){
          return formatError([stampRewardCustomerError.CUSTOMER_HAS_NOT_STAMP_FOR_REMOVE_PROCESS],)
        }else{
          const input = {
            id: uuid.get(),
            customerId,
            counterValue: 1,
            claimStatus: (1 >= stampRewardConfig.counterMaxValue)
          }
          promises.push(this.db.table(this.tableName)
            .insert(input));
          const logInput = {
            id: uuid.get(),
            logType: stampRewardLogType.CREATE_ORDER_WITH_REDEMPTION_ITEM,
            referenceOrderId: orderSetId,
            referenceCustomerId: customerId,
            referenceAdminId: adminId,
            request: JSON.stringify(input),
            response: null
          }
          promises.push(this.db.table(this.context.stampRewardLog.tableName)
            .insert(logInput));
          // return { process, stampReward: await this.getByCustomerId(customerId) };       
        }
      }
    }else {
      return formatError([stampRewardCustomerError.INVALID_ORDER],)
    } 
    if (promises.length > 0) {
      await Promise.all(promises);
    }
    return { process, stampReward: await this.getByCustomerId(customerId) }; 
  }
}

module.exports = StampRewardCustomer;
