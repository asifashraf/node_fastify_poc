module.exports = {
  GiftCardTemplate: {
    async collection({ id }, args, context) {
      return context.giftCardTemplate.loaders.giftCardTemplate.load(id);
    },
    async brand({ id }, args, context) {
      return context.giftCardTemplate.loaders.brand.load(id);
    },
    async brands({ id }, args, context) {
      return context.giftCardTemplate.loaders.brands.load(id);
    },
    async currency({ id }, args, context) {
      return context.giftCardTemplate.loaders.currency.load(id);
    },
    async country({ id }, args, context) {
      return context.giftCardTemplate.loaders.country.load(id);
    },
  },
};
