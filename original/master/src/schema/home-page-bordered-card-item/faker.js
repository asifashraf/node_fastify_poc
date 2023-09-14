const { faker } = require('@faker-js/faker');
const { addLocalizationMultipleFields } = require('../../lib/util');
const fakeCardItems = () => {
  return {
    id: faker.datatype.uuid(),
    image: faker.image.avatar(),
    imageAr: faker.image.avatar(),
    imageTr: faker.image.avatar(),
    title: faker.name.fullName(),
    titleAr: faker.name.fullName(),
    titleTr: faker.name.fullName(),
    subtitle: faker.name.firstName(),
    subtitleAr: faker.name.firstName(),
    subtitleTr: faker.name.firstName()
  };
};
const getCardItems = () => {
  return addLocalizationMultipleFields(Array.from({ length: 5 }, fakeCardItems), ['title', 'image', 'subtitle']);
};

const fakeSectionMetadata = (sectionId, countryId) => {
  return {
    id: sectionId,
    header: faker.name.fullName(),
    headerAr: faker.name.fullName(),
    headerTr: faker.name.fullName(),
    refQueryId: faker.datatype.uuid(),
    sortOrder: faker.datatype.number({ max: 4 }),
    countryId,
    isMust: true,
    isAuthRequired: true,
    isLocationBased: true,
    isPaginated: true,
    itemType: faker.helpers.arrayElement(['SEARCH_ITEM', 'REORDER_ITEM', 'ORDER_TRACKING_ITEM']),
  };
};

const getSectionMetadata = (sectionId, countryId) => {

  return addLocalizationMultipleFields(fakeSectionMetadata(sectionId, countryId), ['header']);
};
const FakeData = { getCardItems, getSectionMetadata };


module.exports = FakeData;
