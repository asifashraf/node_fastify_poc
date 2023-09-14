module.exports = {
  StoreOrderStatus: {
    storeOrder({ storeOrderId }, args, context) {
      return context.storeOrder.getById(storeOrderId);
    },
  },
};
