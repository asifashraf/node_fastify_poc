const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');
const {
  omit,
  find,
  concat
} = require('lodash');

class MenuItemOption extends BaseModel {
  constructor(db, context) {
    super(db, 'menu_item_options', context);
    this.loaders = createLoaders(this);
  }
  async saveMenuItemOptionV2(input) {
    const itemOptionIds = await super.save(input);
    return itemOptionIds;
  }

  async save(input, brand, skipEvents = false) {
    const {email} = this.context.auth;
    const adminId = this.context.auth.id;
    const optionIds = [];
    const deletedItemList = [];
    const createdItemList = [];
    const updatedOptionIds = [];
    let updatedItemPriceList = [];
    const countryId = brand.countryId;
    brand = omit(brand, ['countryId']);
    if (!skipEvents) {
      input.map(function (option) {
        if (option.id) {
          optionIds.push(option.id);
          if (option.deleted) {
            const obj = {itemName: option.value, itemId: option.id, changerAccount: email, changerId: adminId};
            deletedItemList.push({
              eventType: 'ITEM_DELETED',
              countryId,
              eventData: {...brand, ...obj}
            });
          } else updatedOptionIds.push(option.id);
        }
      });
      const updatedItems = await this.db(this.tableName).select('*').whereIn('id', updatedOptionIds);
      updatedItemPriceList = updatedItems.map(item => {
        const updatedItem = find(input, option => option.id === item.id && option.price !== item.price);
        if (updatedItem) {
          return {
            eventType: 'ITEM_PRICE_CHANGE',
            countryId,
            eventData: {...brand, ...{itemName: updatedItem.value, itemId: item.id, oldPrice: item.price, newPrice: updatedItem.price, changerAccount: email, changerId: adminId}}
          };
        } return null;
      });
      updatedItemPriceList = updatedItemPriceList.filter(n => n);
    }
    const itemOptionIds = await super.save(input);
    if (!skipEvents) {
      let deletedOptionNumber = 0;
      input.forEach((element, index) => {
        if (!element.id) {
          createdItemList.push({
            eventType: 'ITEM_CREATED',
            countryId,
            eventData: {...brand, ...{itemName: element.value, itemId: itemOptionIds[index - deletedOptionNumber], changerAccount: email, changerId: adminId}}
          });
        } else if (element.deleted) {
          deletedOptionNumber++;
        }
      });
      await this.context.events.save(concat(updatedItemPriceList, deletedItemList, createdItemList));
    }
    return itemOptionIds;
  }
  async getByMenuOptionSetWithoutLoader(menuItemOptionSetId) {
    const menuItemOptions = await this
      .db('menu_item_options')
      .where('menu_item_option_set_id', menuItemOptionSetId)
      .orderBy('sort_order', 'ASC');

    return menuItemOptions;
  }

  getByMenuOptionSet(menuItemOptionSetId) {
    return this.loaders.byMenuOptionSet.load(menuItemOptionSetId);
  }

  async getMenuOptionInfoWithOptionSets(menuItemId, optionSetIds) {
    const select = 'ARRAY_AGG(mio.id) as option_id, mios.id as option_set_id, mios.single';
    return await this.roDb(`${this.tableName} as mio`)
      .select(this.db.raw(select))
      .leftJoin('menu_item_option_sets AS mios', 'mios.id', 'mio.menu_item_option_set_id')
      .where('mios.menu_item_id', menuItemId)
      .whereIn('mio.id', optionSetIds)
      .groupBy('mios.id');
  }
}

module.exports = MenuItemOption;
