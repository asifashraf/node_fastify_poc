const {
  formatError,
  addLocalizationField
} = require('../../lib/util');
const { cSubscriptionMenuItemsWithOptionsSaveError, cSubscriptionMenuItemsWithOptionsDeleteError } = require('./enum');

module.exports = {
  CSubscriptionMenuItem: {
    async options({ id }, args, context) {
      return context.cSubscriptionMenuItemOption.getByCSubscriptionMenuItemId(id);
    },
    async menuSectionId({ menuItemId }, args, context) {
      const menuItem = await context.menuItem.getById(menuItemId);
      if (menuItem) {
        return menuItem.sectionId;
      }
      return null;
    },
    async photo({ id, menuItemId }, args, context) {
      const menuItem = await context.menuItem.getById(menuItemId);
      return menuItem.photo;
    },
    async name({ id, menuItemId }, args, context) {
      const menuItem = addLocalizationField(await context.menuItem.getById(menuItemId), 'name');
      return menuItem.name;
    }
  },
  Mutation: {
    async saveCSubscriptionMenuItemsWithOptions(
      root,
      { items, subscriptionId },
      context
    ) {
      const auth = context.auth;
      const admin = await context.admin.getByAuthoId(auth.id);
      if (admin && !auth.isVendorAdmin) {
        const { uniqItems, formatErrors } = await context.cSubscriptionMenuItem.formatData(items, subscriptionId);
        const errors = await context.cSubscriptionMenuItem.validateInput(uniqItems, subscriptionId);
        const allErrors = [...errors, ...formatErrors];
        if (allErrors.length > 0) {
          return formatError(allErrors, uniqItems);
        }
        const result = await context.withTransaction(
          'cSubscriptionMenuItem',
          'saveMenuItemsWithOptions',
          uniqItems
        );
        return { errors: null, items: result };
      }
      return { errors: [cSubscriptionMenuItemsWithOptionsSaveError.UNAUTHORIZED_PROCESS] };
    },
    async deleteCSubscriptionMenuItem(
      root,
      { subscriptionId, menuItemIds },
      context
    ) {
      const auth = context.auth;
      const admin = await context.admin.getByAuthoId(auth.id);
      if (admin && !auth.isVendorAdmin) {
        const errors = context.cSubscriptionMenuItem.validateDeleteInput(subscriptionId, menuItemIds);
        if (errors.length > 0) {
          return formatError(errors, { subscriptionId, menuItemIds });
        }
        const deleted = await context.withTransaction(
          'cSubscriptionMenuItem',
          'deleteMenuItemsWithOptions',
          { subscriptionId, menuItemIds }
        );
        return { errors: null, deleted };
      }
      return { errors: [cSubscriptionMenuItemsWithOptionsDeleteError.UNAUTHORIZED_PROCESS] };
    }
  },
  Query: {
    async getCSubscriptionMenuItemsByFilters(
      root,
      { paging, filters },
      context
    ) {
      return context.cSubscriptionMenuItem.getQueryByFilters(filters, paging);
    },
    async getCupsByLocationForQuickOrder(
      root,
      { subscriptionId, location },
      context
    ) {
      return context.cSubscriptionMenuItem.getCupsByLocationForQuickOrder(subscriptionId, location);
    },
  }
};
