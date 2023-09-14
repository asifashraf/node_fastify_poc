module.exports = {
  Inventory: {
    async product({ productId }, args, context) {
      return context.product.getById(productId, true);
    },
    async pickupLocation({ pickupLocationId }, args, context) {
      return context.pickupLocation.getById(pickupLocationId);
    },
  },
};
