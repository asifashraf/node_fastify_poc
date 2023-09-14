const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');
const { omit, uniq } = require('lodash');
const { stampRewardEligibleItemError } = require('./enums');
const { menuItemStatus } = require('../menu-item/enums');
const { uuid, addLocalizationMultipleFields } = require('../../lib/util');

class StampRewardEligibleItem extends BaseModel {
  constructor(db, context) {
    super(db, 'stamp_reward_eligible_items', context);
    this.loaders = createLoaders(this);
  }

  async getEligibleItems(onlyActive = true){
    const query = this.db({srei: this.tableName})
      .select('mi.*', 'srei.id as eligible_item_id')
      .leftJoin({mi: this.context.menuItem.tableName},
        'mi.id', 'srei.item_id');
    if(onlyActive){
      query.where('mi.status', menuItemStatus.ACTIVE)
    }  
    const eligibleItems = await query;
    const items = eligibleItems.map(item => {
      const id = item.eligibleItemId;
      const menuItem = omit(item, ['eligibleItemId']);
      addLocalizationMultipleFields(menuItem, ['name', 'description'])
      return {id, item: menuItem};
    });
    return items;
  }

  async saveEligibleItems(input){
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
      return { errors: [stampRewardEligibleItemError.TRANSACTIONAL_ERROR] };
    });
  }

  async validateEligibleItems(input){
    const errors = [];
    const admin = await this.context.admin.getByAuthoId(this.context.auth.id);
    if(!admin){
      errors.push(stampRewardEligibleItemError.UNAUTHORIZED_ADMIN);
    }else {
      const deletedItems = uniq(input.filter(item => item.isDeleted).map(item => item.itemId));
      const activeItems = uniq(input.filter(item => !item.isDeleted).map(item => item.itemId));
      
      const { count: activeItemCount } = await this.db(this.context.menuItem.tableName).count().whereIn('id', activeItems).first();
      const { count: deletedItemCount } = await this.db(this.tableName).count().whereIn('item_id', deletedItems).first();
      if(activeItemCount != activeItems.length){
        errors.push(stampRewardEligibleItemError.INVALID_MENU_ITEM);
      }
      if(deletedItemCount != deletedItems.length){
        errors.push(stampRewardEligibleItemError.INVALID_ELIGIBLE_ITEM);
      }

      if(!activeItems.every(itemId => !deletedItems.includes(itemId))){
        errors.push(stampRewardEligibleItemError.INVALID_INPUT);
      }
    }
    return errors;
  }

  async findStampRewardEligibleMenuItem(items){
    items.sort((a, b) => a.price.intValue - b.price.intValue);
    const itemIds = uniq(items.map(item => item.itemId));
    const eligibleItems = await this.db({srei: this.tableName})
      .select('srei.item_id')
      .leftJoin({mi: this.context.menuItem.tableName},
        'mi.id', 'srei.item_id')
      .where('mi.status', menuItemStatus.ACTIVE)
      .whereIn('srei.item_id', itemIds)
      .then(rows => {
        return rows.map(row => row.itemId);
      });
    return eligibleItems;  
  }
}

module.exports = StampRewardEligibleItem;
