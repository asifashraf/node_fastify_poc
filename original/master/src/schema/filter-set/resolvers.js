const { addLocalizationMultipleFields } = require('../../lib/util');
module.exports = {
  Query: {
    async filterSets(root, { filters, paging }, context) {
      return context.filterSet.getAll(filters, paging);
    },
  },
  Mutation: {
    async saveFilterSet(root, { input }, context) {
      return context.filterSet.save(input);
    },
    async deleteFilterSet(root, { input }, context) {
      return context.filterSet.deleteById(input);
    },
  },
  FilterSet: {
    async brands(root, args, context) {
      if (root.brandIds) {
        const results = await context.brand.getById(root.brandIds);
        return addLocalizationMultipleFields(results, ['name']);
      }
      return null;
    },
    async tags(root, args, context) {
      if (root.tagIds) {
        const results = await context.tag.getByIds(root.tagIds);
        return addLocalizationMultipleFields(results, ['name']);
      }
      return null;
    },
    fulfillmentTypes(root, args, context) {
      if (root.fulfillmentTypes)
        return root.fulfillmentTypes;
      return null;
    }
  }
};
