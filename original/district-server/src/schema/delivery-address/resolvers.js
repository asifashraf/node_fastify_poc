module.exports = {
  DeliveryAddress: {
    neighborhood({ neighborhoodId }, args, context) {
      return context.neighborhood.getById(neighborhoodId);
    },
  },
};
