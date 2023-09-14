module.exports = {
  Query: {
    async getIconButtonItems(root, { input }, context) {
      const { refQueryId, countryId, sectionId} = input;
      const iconButtonItems = await context.iconButtonItem.getAllItems({ countryId, refQueryId });
      return { items: iconButtonItems, sectionMetadata: null, sectionId, countryId };
    },
    async getIconItemsForAdmin(root, { countryId, sectionId, status }, context) {
      const iconItems = await context.iconButtonItem.getAllWithResolver({ countryId, sectionId, status });
      return iconItems;
    },

  },
  Mutation: {
    async saveIconButtonItem(root, { iconButtonItemInfo, iconButtonItemSettingInfo }, context) {
      const retVal = await context.iconButtonItem.saveItemAndSettings({ iconButtonItemInfo, iconButtonItemSettingInfo });
      return retVal;
    }
  },
  IconButtonItemData: {
    async sectionMetadata({ sectionId, countryId }, args, context) {
      const sectionMetadata = await context.homePageSection.getByIdWithResolver(sectionId, countryId);
      return sectionMetadata;
    }
  },
  IconButtonItem: {
    async tags({ id }, args, context) {
      return await context.tagRelation.getTagsByRelId(id);
    },
  }

};
