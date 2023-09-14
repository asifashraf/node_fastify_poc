const { formatError } = require('../../lib/util');
const { saveSectionErrorEnum, homePageSectionStatusEnum } = require('./enum');

module.exports = {
  Query: {
    async getHomePageSections(root, { countryId}, context) {
      const filters = { status: homePageSectionStatusEnum.ACTIVE };
      return context.homePageSection.getSectionsByCountryId(countryId, filters);
    },
    async getHomePageSectionsForAdmin(root, { countryId, filters }, context) {
      return context.homePageSection.getSectionsByCountryId(countryId, filters);
    }
  },
  Mutation: {
    async saveHomePageSection(root, { sectionInfo }, context) {
      const auth = context.auth;
      const admin = await context.admin.getByAuthoId(auth.id);
      if (!admin || (admin && auth.isVendorAdmin)) {
        return formatError([saveSectionErrorEnum.UNAUTHORIZED_ADMIN]);
      }
      const validationResult = await context.homePageSection.validate(sectionInfo);
      if (validationResult.length > 0) {
        return formatError(validationResult);
      }
      //const section = await context.homePageSection.save(sectionInfo);
      return await context.withTransaction(
        'homePageSection',
        'save',
        sectionInfo,
      ).then(result => {
        return {section: result};
      }).catch(err => {
        return {errors: [saveSectionErrorEnum.UNAUTHORIZED_ADMIN]};
      });
    },
    async sortHomePageSections(root, {countryId, homePageSections, status}, context) {
      const auth = context.auth;
      const admin = await context.admin.getByAuthoId(auth.id);
      if (!admin || (admin && auth.isVendorAdmin)) {
        return formatError([saveSectionErrorEnum.UNAUTHORIZED_ADMIN]);
      }
      const validationResult = await context.homePageSection.validateSortOrder(countryId, homePageSections, status);
      if (validationResult.length > 0) {
        return formatError(validationResult);
      }
      const sortedSections = await context.homePageSection.sort(countryId, homePageSections, status);
      return {sortedSections};
    }
  },
  HomePageSection: {
    async isShowHeader(root) {
      if (root.header.en && root.header.ar && root.header.tr) return true;
      return false;
    },
    async viewAllLabel(root, args, context, info) {
      return {
        en: 'View all',
        ar: 'عرض الكل',
        tr: 'Hepsini Göster',
      };
    },
  }
};
