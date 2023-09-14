module.exports = {
  Mutation: {
    async saveSuggestBrand(
      root,
      { suggestBrand },
      context
    ) {
      const { shopName, location, isOwner } = suggestBrand;
      const customerId = context.auth.id;
      const error = await context.suggestBrand.validate(shopName, location, isOwner);
      if (error) {
        return { error, saved: false };
      }
      return context.suggestBrand.saveSuggestBrand({ shopName, location, isOwner, customerId });
    },
  }
};
