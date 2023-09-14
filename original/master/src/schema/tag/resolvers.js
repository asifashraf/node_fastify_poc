const { addLocalizationField } = require('../../lib/util');
module.exports = {
  Tag: {
    async brandLocations({ id }, args, context) {
      return addLocalizationField(
        await context.tagRelation.getBrandLocationsByTagId(id),
        'name',
      );
    },
    async menuItems({ id }, args, context) {
      return addLocalizationField(
        await context.tagRelation.getMenuItemsByTagId(id),
        'name',
      );
    },
    async iconUrl(root, args, context) {
      const locRoot = addLocalizationField(
        root,
        'iconUrl',
      );
      return locRoot?.iconUrl;
    },
  },
  Query: {
    async tags(root, { filters, paging }, context) {
      return context.tag.getByFilters(filters, paging);
    },
  },
  Mutation: {
    async saveTag(root, { tag }, context) {
      return context.tag.save(tag);
    },
  }
};
