module.exports = {
  Query: {
    async getCardListItems(root, { input }, context) {
      const { refQueryId, countryId, location, sectionId, page, branchRating } = input;
      const sectionMetadata = await context.homePageSection.getById(sectionId);
      /*
      const allActiveSections = await context.homePageSection.getHomePageSections(countryId, null);
      const activeCardListItemSections = allActiveSections.filter(section => section.itemType == homePageSectionItemTypeEnum.CARD_LIST_ITEM);
      const sectionIndex = activeCardListItemSections.findIndex(section => section.id == sectionId);
      let offset = 0;
      if(sectionIndex > 0){
        activeCardListItemSections.forEach((section, index) => {
          if(sectionIndex > index){
            offset += section.perPage;
          }else if(sectionIndex == index){
            if(sectionMetadata.isLimited){

            }else {
              if(page && page > 1){
                offset += (page-1) * section.perPage;
              }
            }
          }
        })
      }
      */

      const limit = sectionMetadata.perPage ?? 5;
      const offset = sectionMetadata.offset ?? 0;
      const paging = page !== undefined ? {
        offset: offset + (page - 1 ?? 0) * limit,
        limit,
      } : null;
      const res = await context.cardListItem.getAllItems({ refQueryId, countryId, location, paging, branchRating });
      const isNextPage = res ? (res.length >= limit) : false;
      return { items: res, isNextPage, sectionMetadata, sectionId, countryId };
    },
  },
  CardListItem: {
    async tag({ id }, args, context) {
      return await context.tagRelation.loaders.getTagsByRelId.load(id);
    },
  }
};
