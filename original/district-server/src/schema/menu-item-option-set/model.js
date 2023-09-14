const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');
class MenuItemOptionSet extends BaseModel {
  constructor(db) {
    super(db, 'menu_item_option_sets');
    this.loaders = createLoaders(this);
  }

  async getByMenuItemWithoutLoader(menuItemId) {
    const optionSets = await this
      .db('menu_item_option_sets')
      .where('menu_item_id', menuItemId)
      .orderBy('sort_order', 'ASC');

    return optionSets;
  }

  getByMenuItem(menuItemId) {
    return this.loaders.byMenuItem.load(menuItemId);
  }

  async getFirstByMenuItemAndSortOrder(menuItemId) {
    return await this.db(this.tableName)
      .where('menu_item_id', menuItemId)
      .orderBy('sort_order', 'ASC')
      .first();
  }
}

module.exports = MenuItemOptionSet;
