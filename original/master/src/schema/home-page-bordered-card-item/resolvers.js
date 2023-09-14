const FakeData = require('./faker');
module.exports = {
  Query: {
    async getBorderedCardItems(root, { input }, context) {
      const { countryId, sectionId } = input;
      // const borderedCardItems = await context.borderedCardItem.getAll();
      // return { items: borderedCardItems, sectionMetadata: null, sectionId, countryId };
      return { items: FakeData.getCardItems, sectionMetadata: null, sectionId, countryId };
    }
  },
  BorderedCardItemData: {
    async sectionMetadata({ sectionId, countryId }, args, context) {
      //  const sectionMetadata = await context.homePageSection.getById(sectionId, countryId);
      //  return sectionMetadata;
      return FakeData.getSectionMetadata(sectionId, countryId);

    }
  },
};
