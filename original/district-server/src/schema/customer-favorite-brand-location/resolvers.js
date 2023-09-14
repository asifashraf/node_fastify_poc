module.exports = {
  CustomerFavoriteBrandLocation: {
    brand({ brandLocationId }, args, context) {
      return context.brand.getByBrandLocation(brandLocationId);
    },
    brandLocation({ brandLocationId }, args, context) {
      return context.brandLocation.getById(brandLocationId);
    },
  },
};
