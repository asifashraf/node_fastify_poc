const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');
const { omit, uniq } = require('lodash');
const { stampRewardRedemptionItemError } = require('./enums');
const { menuItemStatus } = require('../menu-item/enums');
const { uuid, addLocalizationMultipleFields } = require('../../lib/util');

class StampRewardRedemptionItem extends BaseModel {
  constructor(db, context) {
    super(db, 'stamp_reward_redemption_items', context);
    this.loaders = createLoaders(this);
  }

  async getRedemptionItems(onlyActive = true){
    const query = this.db({srri: this.tableName})
      .select('mi.*', 'srri.id as redemption_item_id')
      .leftJoin({mi: this.context.menuItem.tableName},
        'mi.id', 'srri.item_id');
    if(onlyActive){
      query.where('mi.status', menuItemStatus.ACTIVE)
    }  
    const redfamptionItems = await query;
    const items = redfamptionItems.map(item => {
      const id = item.redemptionItemId;
      const menuItem = omit(item, ['redemptionItemId']);
      addLocalizationMultipleFields(menuItem, ['name', 'description'])
      return {id, item: menuItem};
    });
    return items;
  }

  async saveRedemptionItems(input){
    const deletedItems = uniq(input.filter(item => item.isDeleted).map(item => item.itemId));
    const activeItems = uniq(input.filter(item => !item.isDeleted).map(item => item.itemId));
    return await this.context.db.transaction(async trx => {
      if(deletedItems.length > 0){
        await trx(this.tableName)
          .whereIn('item_id', deletedItems)
          .del();
      }
      const insertedItems = activeItems.map(item => {
        return {
          id: uuid.get(),
          itemId: item,
        }
      })
      await trx(this.tableName)
        .insert(insertedItems)
        .onConflict('item_id')
        .ignore();
      return true;
    }).catch(async error => {
      return { errors: [stampRewardRedemptionItemError.TRANSACTIONAL_ERROR] };
    });
  }

  async validateRedemptionItems(input){
    const errors = [];
    const admin = await this.context.admin.getByAuthoId(this.context.auth.id);
    if(!admin){
      errors.push(stampRewardRedemptionItemError.UNAUTHORIZED_ADMIN);
    }else {
      const deletedItems = uniq(input.filter(item => item.isDeleted).map(item => item.itemId));
      const activeItems = uniq(input.filter(item => !item.isDeleted).map(item => item.itemId));
      
      const { count: activeItemCount } = await this.db(this.context.menuItem.tableName).count().whereIn('id', activeItems).first();
      const { count: deletedItemCount } = await this.db(this.tableName).count().whereIn('item_id', deletedItems).first();
      if(activeItemCount != activeItems.length){
        errors.push(stampRewardRedemptionItemError.INVALID_MENU_ITEM);
      }
      if(deletedItemCount != deletedItems.length){
        errors.push(stampRewardRedemptionItemError.INVALID_REDEMPTION_ITEM);
      }

      if(!activeItems.every(itemId => !deletedItems.includes(itemId))){
        errors.push(stampRewardRedemptionItemError.INVALID_INPUT);
      }
    }
    return errors;
  }

  async getOrderRedemptionItemCount(orderSetId){
    let orderSetItems = await this.context.orderItem.getByOrderSetId(orderSetId);
    if(orderSetItems.length > 0){
      const orderSetItemIds = uniq(orderSetItems.map(item => item.menuItemId));
      const redemptionItems = (await this.db({srri: this.tableName})
        .select('srri.item_id')
        .leftJoin({mi: this.context.menuItem.tableName},
          'mi.id', 'srri.item_id')
        .where('mi.status', menuItemStatus.ACTIVE)
        .whereIn('mi.id', orderSetItemIds)).map(item => item.itemId);
      if(redemptionItems.length > 0){
        return orderSetItems.reduce((acc, orderItem) => {
          if(redemptionItems.includes(orderItem.menuItemId)){
            return acc + orderItem.quantity;
          }else return acc;
        }, 0)
      } 
    }
    return 0;
  }

}

module.exports = StampRewardRedemptionItem;
