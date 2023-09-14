module.exports = {
  Query: {
    async getHomePageSections(root, { countryId, filters }, context) {
      const sections = await context.homePageSection.getAllSectionsByCountryId(countryId, filters);
      return sections;
    }
  },
  Mutation: {
    async saveHomePageSection(root, { sectionInfo, sectionSettingInfo }, context) {
      const retVal = await context.withTransaction(
        'homePageSection',
        'saveSectionAndSettings',
        { sectionInfo, sectionSettingInfo },
      );
      return retVal;
    }
  },
  HomePageSection: {
    async isShowHeader(root) {
      if (root.header.en && root.header.ar && root.header.tr) return true;
      return false;
    }
  }
};
