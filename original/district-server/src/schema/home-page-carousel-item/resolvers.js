const { formatError } = require('../../lib/util');
const { saveCarouselItemErrorEnum } = require('./enum');

module.exports = {
  Query: {
    async getCarouselItems(root, { input }, context) {
      const { refQueryId, countryId, sectionId } = input;
      const carouselItems = await context.carouselItem.getAllItems({ countryId, refQueryId });
      return { items: carouselItems, sectionMetadata: null, sectionId, countryId };
    },
    async getCarouselItemsForAdmin(root, { countryId, sectionId, status }, context) {
      const carouselItems = await context.carouselItem.getAllWithResolver({ countryId, sectionId, status });
      return carouselItems;

    }
  },
  Mutation: {
    async saveCarouselItem(root, { carouselItemInfo, carouselItemSettingInfo }, context) {
      const auth = context.auth;
      const admin = await context.admin.getByAuthoId(auth.id);
      if (!admin || (admin && auth.isVendorAdmin)) {
        return formatError([saveCarouselItemErrorEnum.UNAUTHORIZED_ADMIN]);
      }
      const retVal = await context.withTransaction(
        'carouselItem',
        'saveCarouselItemAndSettings',
        { carouselItemInfo, carouselItemSettingInfo },
      );
      return retVal;
    },
  },
  CarouselItemData: {
    async sectionMetadata({ sectionId, countryId }, args, context) {
      const sectionMetadata = await context.homePageSection.getById(sectionId);
      return sectionMetadata;
    }
  },
};