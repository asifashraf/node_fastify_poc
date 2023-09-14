module.exports = {
  OrderFulfillment: {
    deliveryAddress({ id }, args, context) {
      return context.deliveryAddress.loaders.byOrderFulfillment.load(id);
    },
  },
};
