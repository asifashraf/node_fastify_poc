const { abandonedCartInfo } = require('./enums');
const { addLocalizationField } = require('../../lib/util');

module.exports = {
  AbandonedCart: {
    async cartItemDetails(root, args, context) {
      return context.abandonedCart.cartItemsExtended(root);
    },
    async branch(root, { id }, context) {
      const { branchId } = root;
      return addLocalizationField(
        await context.brandLocation.getById(branchId),
        'name',
      );
    },
  },
  Query: {
    async getActiveCart(root, { }, context) {
      const customerId = context.auth.id;
      let info = abandonedCartInfo.NO_ACTIVE_CART_EXISTS;
      const cart = await context.abandonedCart.getActiveCart({ customerId });
      if (cart) {
        info = abandonedCartInfo.ACTIVE_CART_EXISTS;
      }
      return { info, cart };
    }
  },
  Mutation: {
    async saveCart(
      root,
      { deviceId, basketId, countryId, branchId, cartItems },
      context
    ) {
      return context.abandonedCart.saveCart(
        { deviceId, basketId, countryId, branchId, cartItems }
      );

    },
    async clearCart(
      root,
      { },
      context
    ) {
      const customerId = context.auth.id;
      return context.abandonedCart.clearCart({ customerId });
    },
  }
};
