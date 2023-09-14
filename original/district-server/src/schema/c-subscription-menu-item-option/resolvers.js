const {
  formatError,
} = require('../../lib/util');
const { cSubscriptionMenuItemOptionsDeleteError } = require('./enum');

module.exports = {
  CSubscriptionMenuItemOption: {
    async optionSetId({ menuItemOptionId }, args, context) {
      const menuOption = await context.menuItemOption.getById(menuItemOptionId);
      if (menuOption) {
        return menuOption.menuItemOptionSetId;
      }
      return null;
    }
  },
  Query: {
    async getCSubscriptionMenuItemOptionsByFilters(
      root,
      { paging, filters },
      context
    ) {
      return context.cSubscriptionMenuItemOption.getQueryByFilters(filters, paging);
    },
  },
  Mutation: {
    async deleteCSubscriptionMenuItemOption(
      root,
      { subscriptionId, menuItemOptionIds },
      context
    ) {
      const auth = context.auth;
      const admin = await context.admin.getByAuthoId(auth.id);
      if (admin && !auth.isVendorAdmin) {
        const errors = context.cSubscriptionMenuItemOption.validateDeleteInput(subscriptionId, menuItemOptionIds);
        if (errors.length > 0) {
          return formatError(errors, { subscriptionId, menuItemOptionIds });
        }
        const deleted = await context.withTransaction(
          'cSubscriptionMenuItemOption',
          'deleteMenuItemOptions',
          { subscriptionId, menuItemOptionIds }
        );
        return { errors: null, deleted };
      }
      return { errors: [cSubscriptionMenuItemOptionsDeleteError.UNAUTHORIZED_PROCESS] };
    }
  },
};
