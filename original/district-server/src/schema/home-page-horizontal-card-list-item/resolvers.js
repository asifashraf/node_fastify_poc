const { formatError, addLocalizationField } = require('../../lib/util');
const { horizontalCardListItemType, builtinComponents, horizontalCardListItemError } = require('./enum');
const { homePageSectionStatusEnum } = require('../home-page-section/enum');
const { homePage } = require('../../../config');

module.exports = {
  Query: {
    async getHorizontalCardListItems(root, { input }, context) {
      const { refQueryId, countryId, location, sectionId, page } = input;
      const sectionMetadata = await context.homePageSection.getById(sectionId);
      if (!sectionMetadata || sectionMetadata.status != homePageSectionStatusEnum.ACTIVE) return {items: [], isNextPage: false, sectionMetadata};
      const limit = sectionMetadata?.perPage || homePage.horizontalCardListItemPerPageItemNumber;
      const offset = (page && (page - 1) * limit) || 0;
      const paging = (page !== undefined) ? { offset, limit } : null;
      let res = await context.horizontalCardListItem.getAllItems({ sectionMetadata, refQueryId, countryId, location, paging });
      const isNextPage = res.length >= limit;
      if (refQueryId != builtinComponents.EXPRESS_ZONE) {
        res = res.slice(0, limit);
      }
      return { items: res, isNextPage, sectionMetadata};
    },
    async getHorizontalCardListItemsForAdmin(root, { countryId, status, type }, context) {
      const auth = context.auth;
      const admin = await context.admin.getByAuthoId(auth.id);
      if (!admin || (admin && auth.isVendorAdmin)) {
        return [];
      }
      return await context.horizontalCardListItem.getAllItemsForAdmin({ countryId, status, type });
    },
  },
  Mutation: {
    async saveHorizontalCardListItems(root, {input }, context) {
      const auth = context.auth;
      const admin = await context.admin.getByAuthoId(auth.id);
      if (!admin || (admin && auth.isVendorAdmin)) {
        return formatError([horizontalCardListItemError.UNAUTHORIZED_ADMIN]);
      }
      const validationResult = await context.horizontalCardListItem.validate(input);
      if (validationResult.length > 0) {
        return formatError(validationResult);
      }
      const {errors, horiziontalCardListItems} = await context.horizontalCardListItem.save(input);
      if (errors) {
        return formatError(errors);
      }
      return {horiziontalCardListItems};
    }
  },
  HorizontalCardListItem: {
    async tag({ id }, args, context) {
      if (id) {
        return await context.tagRelation.getTagsByRelId(id);
      }
      throw new Error('Invalid HorizontalCardListItem ID');
    },
  },
  HorizontalCardItemForAdmin: {
    async itemName({ id, itemId, itemType }, args, context) {
      if (id) {
        if (itemType == horizontalCardListItemType.BRAND_LOCATION) {
          const brandLocation = addLocalizationField(await context.brandLocation.getById(itemId), 'name');
          return brandLocation.name;
        } else {
          const brand = addLocalizationField(await context.brand.getById(itemId), 'name');
          return brand.name;
        }
      }
      throw new Error('Invalid HorizontalCardListItem ID');
    },
  }
};
