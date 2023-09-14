/* eslint-disable camelcase */
const BaseModel = require('../../base-model');
const { cSubscriptionMenuItemOptionsDeleteError } = require('./enum');
const { addPaging } = require('../../lib/util');
const { map, find, uniq } = require('lodash');

class CSubscriptionMenuItemOption extends BaseModel {
  constructor(db, context) {
    super(db, 'subscription_menu_item_options', context);
  }

  async getByCSubscriptionMenuItemId(cSubscriptionMenuItemId) {
    const query = await this.roDb(this.tableName)
      .where('subscription_menu_item_id', cSubscriptionMenuItemId);
    return query;
  }

  getQueryByFilters(filters, paging) {
    let query = this.db(this.tableName)
      .orderBy('created', 'desc');
    if (filters) {
      query = query.where(filters);
    }
    if (paging) {
      query = addPaging(query, paging);
    }
    return query;
  }


  async getByMenuItemId(menuItemIds) {
    const query = await this.db(this.tableName)
      .whereIn('subscription_menu_item_id', menuItemIds)
      .orderBy('created', 'desc');
    return query;
  }

  async getMenuItemOptionsBySubscriptionId(subscriptionId) {
    const query = await this.roDb(this.tableName)
      .where('subscription_id', subscriptionId);
    return query;
  }

  validateDeleteInput(subscriptionId, menuItemOptionIds) {
    const errors = [];
    if (subscriptionId && subscriptionId.trim() == '') {
      errors.push(cSubscriptionMenuItemOptionsDeleteError.INVALID_SUBSCRIPTION_ID);
    }
    if (menuItemOptionIds && menuItemOptionIds.length == 0) {
      errors.push(cSubscriptionMenuItemOptionsDeleteError.INVALID_CSUBSCRIPTION_MENU_ITEM_ID);
    }
    return errors;
  }

  async findAllByFiltersWithOr(filters) {
    const arr = [];
    for (const el of Object.keys(filters)) {
      const res = {};
      res[el] = filters[el];
      arr.push(res);
    }
    let query = this.db(this.tableName)
      .orderBy('created', 'desc');
    for (const el of arr) {
      if (arr.indexOf(el) == 0) {
        query = query.where(el);
      } else {
        query = query.orWhere(el);
      }
    }
    query = await query;
    return query;
  }

  async deleteByIds(ids) {
    return this.db(this.tableName)
      .whereIn('id', ids)
      .del();
  }

  async deleteMenuItemOptions({ subscriptionId, menuItemOptionIds }) {
    const query = this.getQueryByFilters({ subscriptionId });
    const menuItemOptions = await query.whereIn('menu_item_option_id', menuItemOptionIds);
    const subsMenuItemIds = uniq(map(menuItemOptions, elem => elem.subscriptionMenuItemId));
    const existings = await this.db(this.tableName)
      .whereNotIn('menu_item_option_id', menuItemOptionIds)
      .whereIn('subscription_menu_item_id', subsMenuItemIds);
    if (existings.length == subsMenuItemIds.length) {
      const subsMenuItemOptionIds = map(menuItemOptions, elem => elem.id);
      const deleted = await this.deleteByIds(subsMenuItemOptionIds);
      return deleted;
    } else {
      return false;
    }
  }

  async removeExisting(items) {
    const arr = [];
    const existings = [];
    for (const item of items) {
      const subscriptionMenuItemOption = await this.getQueryByFilters({ 'menuItemOptionId': item.menuItemOptionId });
      if (!subscriptionMenuItemOption) {
        arr.push(item);
      } else {
        const cSubscriptionMenuItemOption = find(
          subscriptionMenuItemOption,
          t => t.subscriptionId == item.subscriptionId && t.subscriptionMenuItemId == item.subscriptionMenuItemId
        );
        if (!cSubscriptionMenuItemOption) {
          arr.push(item);
        } else {
          existings.push(item);
        }
      }
    }
    return { arr, existings };
  }
}

module.exports = CSubscriptionMenuItemOption;
