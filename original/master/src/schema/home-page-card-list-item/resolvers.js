module.exports = {
  Query: {
    async getCardListItems(root, { input }, context) {
      const { refQueryId, countryId, location, sectionId, page } = input;
      const sectionMetadata = await context.homePageSection.getByIdWithResolver(sectionId, countryId);
      const limit = sectionMetadata.perPage ?? 5;
      const paging = page !== undefined ? {
        offset: (page - 1 ?? 0) * limit,
        limit,
      } : null;
      const res = await context.cardListItem.getAllItems({ refQueryId, countryId, location, paging });
      const isNextPage = res.length >= limit;
      return { items: res, isNextPage, sectionMetadata, sectionId, countryId };
    },
  },
  CardListItem: {
    async tag({ id }, args, context) {
      return await context.tagRelation.getTagsByRelId(id);
    },
  }
};
