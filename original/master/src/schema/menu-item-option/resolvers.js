module.exports = {
  MenuItemOption: {
    async isSubscribable({ id }, args, context) {
      const subscriptionMenuItems = await context.cSubscriptionMenuItemOption.getQueryByFilters({ menuItemOptionId: id }, null);
      if (subscriptionMenuItems && subscriptionMenuItems.length > 0) {
        return false;
      }
      return true;
    }
  },
};
