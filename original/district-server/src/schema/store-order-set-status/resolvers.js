module.exports = {
  StoreOrderSetStatus: {
    storeOrderSet({ storeOrderSetId }, args, context) {
      return context.storeOrderSet.getById(storeOrderSetId);
    },
  },
};
