/* eslint-disable camelcase */
const BaseModel = require('../../base-model');
const { cSubscriptionMenuItemsWithOptionsSaveError, cSubscriptionMenuItemsWithOptionsDeleteError } = require('./enum');
const { cSubscriptionStatus } = require('../c-subscription/enum');
const { cSubscriptionCustomerStatus } = require('../c-subscription-customer/enum');
const { map, find, filter, sortBy, some } = require('lodash');
const { addPaging, addLocalizationField, now } = require('../../lib/util');
const moment = require('moment');

class CSubscriptionMenuItem extends BaseModel {
  constructor(db, context) {
    super(db, 'subscription_menu_items', context);
  }

  async getBrandByMenuItemId(menuItemId) {
    const query = await this.roDb('menu_items')
      .join('menu_sections', 'menu_sections.id', 'section_id')
      .join('menus', 'menus.id', 'menu_sections.menu_id')
      .where('menu_items.id', menuItemId)
      .first();
    return query.brandId;
  }

  async getMenuItemByOptionId(optionId) {
    const query = await this.roDb('menu_item_options')
      .join('menu_item_option_sets', 'menu_item_option_sets.id', 'menu_item_option_set_id')
      .where('menu_item_options.id', optionId)
      .first();
    return query.menuItemId;
  }

  async getSubscriptionIdByBrandIdAndMenuItemId(brandId, menuItemId) {
    const query = await this.roDb(this.tableName)
      .where('brand_id', brandId)
      .andWhere('menu_item_id', menuItemId)
      .first();
    return query;
  }

  async getSubscriptionIdByMenuItemId(menuItemId) {
    const query = await this.roDb(this.tableName)
      .where('menu_item_id', menuItemId)
      .first();
    return query;
  }

  async getMenuItemsBySubscriptionId(subscriptionId) {
    const query = await this.roDb(this.tableName)
      .where('subscription_id', subscriptionId);
    return query;
  }

  async formatData(arr, subscriptionId) {
    const newArr = [];
    const formatErrors = [];
    let subscription = null;
    if (!subscriptionId || subscriptionId.trim() == '') {
      formatErrors.push(cSubscriptionMenuItemsWithOptionsSaveError.INVALID_SUBSCRIPTION);
    } else {
      subscription = await this.context.cSubscription.getById(subscriptionId);
      if (!subscription) formatErrors.push(cSubscriptionMenuItemsWithOptionsSaveError.INVALID_SUBSCRIPTION);
    }
    if (formatErrors.length === 0) {
      for (const item of arr) {
        if (item.options && item.options.length > 0) {
          for (const option of item.options) {
            const res = {};
            res.subscriptionId = subscriptionId;
            res.brandId = subscription.brandId;
            res.menuItemId = item.menuItemId;
            res.optionId = option;
            newArr.push(res);
          }
        } else {
          formatErrors.push(cSubscriptionMenuItemsWithOptionsSaveError.INVALID_OPTION);
        }
      }
    }
    const uniqItems = this.removeDuplicates(newArr);
    return { uniqItems, formatErrors };
  }

  removeDuplicates(arr) {
    const filtered = [];
    for (const item of arr) {
      if (filtered.indexOf(JSON.stringify(item)) < 0) {
        filtered.push(JSON.stringify(item));
      }
    }
    const uniq = map(filtered, el => JSON.parse(el));
    return uniq;
  }

  async validateInput(items, subscriptionId) {
    const errors = [];
    let subscription = null;
    if (!subscriptionId || subscriptionId.trim() == '') {
      errors.push(cSubscriptionMenuItemsWithOptionsSaveError.INVALID_SUBSCRIPTION);
    } else {
      subscription = await this.context.cSubscription.getById(subscriptionId);
      if (!subscription) errors.push(cSubscriptionMenuItemsWithOptionsSaveError.INVALID_SUBSCRIPTION);
    }
    if (errors.length > 0) return errors;
    for (const item of items) {
      if (!item.menuItemId || item.menuItemId.trim() == '') {
        errors.push(cSubscriptionMenuItemsWithOptionsSaveError.INVALID_MENU_ITEM);
      } else {
        const cSubsMenuItem = await this.getSubscriptionIdByMenuItemId(item.menuItemId);
        if (cSubsMenuItem && cSubsMenuItem.subscriptionId != subscriptionId) {
          errors.push(cSubscriptionMenuItemsWithOptionsSaveError.ALREADY_EXIST_MENU_ITEM);
          break;
        }
        if (!item.brandId || item.brandId.trim() == '') {
          errors.push(cSubscriptionMenuItemsWithOptionsSaveError.INVALID_BRAND);
          break;
        } else {
          const brandId = await this.getBrandByMenuItemId(item.menuItemId);
          if (subscription.brandId != brandId) {
            errors.push(cSubscriptionMenuItemsWithOptionsSaveError.INVALID_BRAND);
            break;
          }
        }
        if (!item.optionId || item.optionId.trim() == '') {
          errors.push(cSubscriptionMenuItemsWithOptionsSaveError.INVALID_OPTION);
          break;
        } else {
          const menuItemId = await this.getMenuItemByOptionId(item.optionId);
          if (menuItemId != item.menuItemId) {
            errors.push(cSubscriptionMenuItemsWithOptionsSaveError.INVALID_OPTION);
            break;
          }
        }
      }
    }
    return errors;
  }


  async removeExisting(items) {
    const arr = [];
    const existings = [];
    for (const item of items) {
      const filters = {
        brandId: item.brandId,
        menuItemId: item.menuItemId,
        subscriptionId: item.subscriptionId
      };
      const subscriptionMenuItem = await this.getQueryByFilters(filters);
      if (subscriptionMenuItem && subscriptionMenuItem.length > 0) {
        existings.push(subscriptionMenuItem[0]);
      } else {
        arr.push(item);
      }
    }
    return { arr, existings };
  }

  async saveMenuItemsWithOptions(items) {
    const itemWithOptions = JSON.parse(JSON.stringify(items));
    let menuItems = map(items, item => {
      delete item['optionId'];
      return item;
    });

    menuItems = this.removeDuplicates(menuItems);
    const { arr, existings } = await this.removeExisting(menuItems);
    let cSubscriptionMenuItems = await Promise.all(
      map(
        await this.save(arr),
        id => this.getById(id)
      )
    );
    cSubscriptionMenuItems = [...cSubscriptionMenuItems, ...existings];

    const optionsArr = [];
    for (const elem of itemWithOptions) {
      const cSubscriptionMenuItem = find(
        cSubscriptionMenuItems,
        t => t.menuItemId == elem.menuItemId && t.subscriptionId == elem.subscriptionId && t.brandId == elem.brandId
      );
      if (cSubscriptionMenuItem) {
        const res = {};
        res.subscriptionId = elem.subscriptionId;
        res.menuItemOptionId = elem.optionId;
        res.subscriptionMenuItemId = cSubscriptionMenuItem.id;
        optionsArr.push(res);
      }
    }

    const option = await this.context.cSubscriptionMenuItemOption.removeExisting(optionsArr);
    await this.context.cSubscriptionMenuItemOption.save(option.arr);
    return cSubscriptionMenuItems;
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

  validateDeleteInput(subscriptionId, menuItemIds) {
    const errors = [];
    if (subscriptionId && subscriptionId.trim() == '') {
      errors.push(cSubscriptionMenuItemsWithOptionsDeleteError.INVALID_SUBSCRIPTION_ID);
    }
    if (menuItemIds && menuItemIds.length == 0) {
      errors.push(cSubscriptionMenuItemsWithOptionsDeleteError.INVALID_MENU_ITEM_ID);
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

  async deleteMenuItemsWithOptions({ subscriptionId, menuItemIds }) {
    const query = this.getQueryByFilters({ subscriptionId });
    const menuItems = await query.whereIn('menu_item_id', menuItemIds);
    const subsMenuItemIds = map(menuItems, elem => elem.id);
    const subsMenuItemOptions = await this.context.cSubscriptionMenuItemOption.getByMenuItemId(subsMenuItemIds);
    const subsMenuItemOptionIds = map(subsMenuItemOptions, elem => elem.id);
    await this.context.cSubscriptionMenuItemOption.deleteByIds(subsMenuItemOptionIds);
    const deleted = await this.deleteByIds(subsMenuItemIds);
    return deleted;

  }

  async getCupsByLocationForQuickOrder(subscriptionId, location) {
    const subscription = await this.context.cSubscription.getById(subscriptionId);
    const branchesInBrand = await this.findBranchesFromBrand(location, subscription.brandId);
    const subscribableItems = await this.db(this.tableName)
      .where('subscription_id', subscriptionId);
    const lastBranches = await Promise.all(map(branchesInBrand, async branch => {
      const branchInfo = await this.context.brandLocation.getById(branch.branchId);
      if (!branchInfo.acceptingOrders) {
        return branch;
      }
      const currentTime = moment(now.get());
      const openings = await this.context.brandLocation.openings(
        branchInfo.id,
        branchInfo.timeZoneIdentifier,
        currentTime,
        1
      );
      const isOpen = some(openings.pickup, opening =>
        currentTime.isBetween(opening.begin, opening.end)
      );
      if (!isOpen) {
        return branch;
      }
      if (subscribableItems.length > 0) {
        const branchItems = [];
        for (const item of subscribableItems) {
          const isItemAvailable = await this.context.menuItem.getAvailability(item.menuItemId, branch.branchId);
          if (isItemAvailable) {
            const subscriptionOptions = await this.context.cSubscriptionMenuItemOption.getByCSubscriptionMenuItemId(item.id);
            item.options = subscriptionOptions;
            branchItems.push(item);
          }
        }
        if (branchItems.length > 0) {
          branch.items = branchItems;
        } else {
          branch.items = null;
        }
      }
      return branch;
    }));
    const filtered = filter(lastBranches, branch => branch.items != null);

    let lastList = filtered;
    if (filtered.length > 7) {
      const sortedByDistance = sortBy(filtered, [i => parseFloat(i.distance)]);
      lastList = sortedByDistance.slice(0, 7);
    }
    const retVal = await Promise.all(map(lastList, async branch => {
      const returnObject = {};
      returnObject.brandId = branch.brandId;
      returnObject.branchId = branch.branchId;
      returnObject.distance = branch.distance;
      const brand = addLocalizationField(await this.context.brand.getById(branch.brandId), 'name');
      returnObject.title = brand.name;
      const brandLocation = addLocalizationField(await this.context.brandLocation.getById(branch.branchId), 'name');
      returnObject.description = brandLocation.name;
      returnObject.photo = brand.favicon;
      return returnObject;
    }));
    return retVal;
  }

  async findBranchesFromBrand(location, brandId) {
    const branches = await this.context.brandLocation.getBranchesOfBrand(location.latitude, location.longitude, brandId);
    return branches;
  }

  async isSubscribableItem(menuItemId) {
    const [{ count }] = await this.roDb(`${this.tableName} as smc`)
      .count('*')
      .leftJoin('subscriptions as s', 's.id', 'smc.subscription_id')
      .leftJoin('subscription_customers as sc', 'sc.subscription_id', 'smc.subscription_id')
      .where('smc.menu_item_id', menuItemId)
      .andWhere('s.status', cSubscriptionStatus.ACTIVE)
      .andWhere('sc.status', cSubscriptionCustomerStatus.ACTIVE);
    return count > 0;
  }
}

module.exports = CSubscriptionMenuItem;
