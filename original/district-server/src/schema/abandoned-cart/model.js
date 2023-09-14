/* eslint-disable camelcase */
const BaseModel = require('../../base-model');
const moment = require('moment');
const { abandonedCartSaveError, abandonedCartStatus } = require('./enums');
const { now, addLocalizationMultipleFields } = require('../../lib/util');
const { abandonedCart } = require('../../../config');
const {
  contentTemplates,
} = require('../../lib/push-notification');
const { notificationCategories } = require('../../lib/notifications');
const { flatten } = require('lodash');
const {
  orderItemsAvailability
} = require('../root/enums');
class AbandonedCart extends BaseModel {
  constructor(db, context) {
    super(db, 'abandoned_carts', context);
  }


  async getActiveCart({ customerId }) {
    const query = await this.db(this.tableName)
      .where({ customer_id: customerId, status: abandonedCartStatus.ACTIVE })
      .first();
    return query;
  }

  async getByBasketId({ basketId }) {
    const query = await this.db(this.tableName)
      .where({ basket_id: basketId })
      .first();
    return query;
  }

  async validateSaveCart({ id, customerId, deviceId, basketId, countryId, cartItems }) {
    const errors = [];
    const activeCart = await this.getActiveCart({ customerId });
    if (id) {
      if (id != activeCart.id) {
        errors.push(abandonedCartSaveError.INVALID_CART_ID);
      }
    } else {
      if (activeCart) {
        errors.push(abandonedCartSaveError.ALREADY_ACTIVE_CART_EXISTS);
      }
    }
    if (!basketId) {
      errors.push(abandonedCartSaveError.INVALID_BASKET_ID);
    } else {
      const existCart = await this.getByBasketId({ basketId });
      if (existCart && existCart.id != id) {
        errors.push(abandonedCartSaveError.ALREADY_EXISTS_BASKET_ID);
      }
    }
    if (!deviceId) {
      errors.push(abandonedCartSaveError.INVALID_DEVICE_ID);
    }
    if (!countryId) {
      errors.push(abandonedCartSaveError.INVALID_COUNTRY_ID);
    }
    if (cartItems && cartItems.length == 0) {
      errors.push(abandonedCartSaveError.INVALID_CART_ITEMS);
    }
    const menuItemIds = cartItems.map(t => t.itemId);
    const menuItems = menuItemIds && menuItemIds.length > 0
      ? (await this.context.menuItem.getByIds(menuItemIds)).filter(item => !!item)
      : [];
    if (cartItems.length !== (menuItems?.length ?? 0)) {
      errors.push(abandonedCartSaveError.INVALID_CART_ITEMS);
    }
    return errors;

  }

  async saveCart(input) {
    const { id, deviceId, basketId, countryId, cartItems } = input;
    const customerId = this.context.auth.id;
    await this.clearCart({ customerId });
    const errors = await this.validateSaveCart({ id, customerId, deviceId, basketId, countryId, cartItems });
    if (errors && errors.length > 0) {
      return { errors, cart: null };
    }
    let reminderCount = 0;
    if (id) {
      const existCart = await this.getById(id);
      if (existCart) {
        reminderCount = existCart.reminderCount;
      }
    }
    const reminderWillSendAt = moment(now.get())
      .add(abandonedCart.reminderSentAfterInMinutes[reminderCount], 'minutes')
      .toISOString();
    const willTimeoutAt = moment(now.get())
      .add(abandonedCart.cartTimeoutInMinutes, 'minutes')
      .toISOString();
    const menuItemIds = cartItems.map(t => t.itemId);
    const menuItems = menuItemIds && menuItemIds.length > 0 ? await this.context.menuItem.getByIds(menuItemIds) : null;
    menuItems.map(menuItem => {
      const cartItemObj = cartItems.find(t => t.itemId === menuItem.id);
      if (cartItemObj) {
        const localizedMenuItem = addLocalizationMultipleFields(menuItem, ['name']);
        cartItemObj.name = localizedMenuItem.name;
      }
    });
    input.cartItems = JSON.stringify(cartItems);
    const obj = {
      customer_id: customerId,
      ...input,
      status: abandonedCartStatus.ACTIVE,
      reminderWillSendAt,
      willTimeoutAt
    };
    const cartId = await this.save(obj);
    const cart = await this.getById(cartId);
    return { errors, cart };
  }

  async clearCart({ customerId }) {
    const cart = await this.getActiveCart({ customerId });
    if (cart) {
      await this.save({ id: cart.id, status: abandonedCartStatus.CLEARED, reminderWillSendAt: null, willTimeoutAt: null });
    }
    return true;
  }

  async timeoutCart({ basketId }) {
    const cart = await this.getByBasketId({ basketId });
    if (cart) {
      await this.save({ id: cart.id, status: abandonedCartStatus.TIMEOUT, reminderWillSendAt: null });
    }
    return true;
  }


  async setCartCompleted({ basketId, orderSetId, branchId, cartItems }) {
    const cart = await this.getByBasketId({ basketId });
    if (cart) {
      cartItems = JSON.stringify(cartItems);
      await this.save({ id: cart.id, status: abandonedCartStatus.COMPLETED, reminderWillSendAt: null, orderSetId, branchId, cartItems, willTimeoutAt: null });
    }
    return true;
  }


  async abandonedCartNotification(basketId, customerId) {
    const message = contentTemplates().contents.abandonedCartReminder;
    const heading = contentTemplates().headings.abandonedCartReminder;

    return {
      push: [
        {
          customerId,
          message,
          heading,
          notificationCategory: notificationCategories.ABANDONED_CART,
          basketId,
        },
      ],
      email: []
    };
  }

  async updateAfterReminderSent({ id, reminderCount }) {
    reminderCount = reminderCount + 1;
    // no reminder will send after this
    // it should be timeout
    if (reminderCount >= abandonedCart.reminderSentAfterInMinutes.length) {
      await this.save({ id, reminderWillSendAt: null });
      return;
    }
    const reminderWillSendAt = moment(now.get())
      .add(abandonedCart.reminderSentAfterInMinutes[reminderCount], 'minutes')
      .toISOString();
    await this.save({ id, reminderWillSendAt, reminderCount, lastReminderSentAt: now.get() });
  }

  async cartItemsExtended(root) {
    const { branchId: brandLocationId, cartItems: storedOrderSetItems } = root;
    if (!brandLocationId || !storedOrderSetItems) {
      return null;
    }

    const menu = await this.context.brandLocation.calculateMenu(brandLocationId);
    const menuItems = flatten(menu.sections.map(section => section.items));
    const missingMenuItems = new Set();

    const relatedMenuItems = storedOrderSetItems
      .map(storedOrderSetItem => {
        const menuItem = menuItems.find(t => t.id === storedOrderSetItem.itemId);

        if (!menuItem || menuItem.soldOut) {
          missingMenuItems.add({
            id: storedOrderSetItem.itemId,
            name: storedOrderSetItem.name,
          });
          return null;
        }

        storedOrderSetItem.selectedOptions.forEach(storedOption => {
          const optionFound = menuItem.optionSets.some(optionSet => {
            if (optionSet.options) {
              const option = optionSet.options.find(t => t.id === storedOption.optionId);
              if (option) {
                option.existInActiveCart = true;
                return true;
              }
            }
            return false;
          });

          if (!optionFound) {
            missingMenuItems.add({
              id: storedOrderSetItem.itemId,
              name: storedOrderSetItem.name,
            });
          }
        });

        return menuItem;
      })
      .filter(item => item !== null);

    let availabilityStatus;
    if (missingMenuItems.size === storedOrderSetItems.length) {
      availabilityStatus = orderItemsAvailability.NO_ITEMS_AVAILABLE;
    } else if (missingMenuItems.size === 0) {
      availabilityStatus = orderItemsAvailability.ALL_ITEMS_AVAILABLE;
    } else {
      availabilityStatus = orderItemsAvailability.PARTIAL_ITEMS_AVAILABLE;
    }

    return {
      cartItemsExtended: relatedMenuItems,
      missingItemNames: Array.from(missingMenuItems).map(t => t.name),
      availabilityStatus,
    };
  }
}


module.exports = AbandonedCart;
