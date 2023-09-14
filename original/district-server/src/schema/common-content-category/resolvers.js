const { addLocalizationField, formatError, removeLocalizationField } = require('../../lib/util');
const { contentCategoryStatus, contentCategoryError } = require('./enum');
const { contentStatus } = require('../common-content/enum');

module.exports = {
  Mutation: {

    async createCommonContentCategory(root, { category }, context) {
      category = removeLocalizationField(category, 'title');
      const contentCategory = await context.commonContentCategory.getBySlugs([category.slug], { countryId: category.countryId });
      if (contentCategory.length) {
        return formatError([contentCategoryError.SLUG_ALREADY_EXISTS]);
      }
      const id = await context.commonContentCategory.save(category);
      let data = await context.commonContentCategory.getById(id);
      data = addLocalizationField(data, 'title');
      return {
        data
      };
    },

    async updateCommonContentCategory(root, { category }, context) {
      // Object.keys is validating how many properties are there in object
      // as "id" is required but there must be atleast one more property so
      // length should be more than 1.
      if (Object.keys(category).length <= 1) {
        return formatError([contentCategoryError.NO_DATA_TO_UPDATE]);
      }
      if (category.slug) {
        if (!category.countryId) {
          return formatError([contentCategoryError.MISSING_COUNTRY_ID]);
        }
        const categorySlugCheck = await context.commonContentCategory.getBySlugs([category.slug], { countryId: category.countryId });
        if (categorySlugCheck.length) return formatError([contentCategoryError.SLUG_ALREADY_EXISTS]);
      }
      const contentCategory = await context.commonContentCategory.getById(category.id);
      if (!contentCategory) return formatError([contentCategoryError.COMMON_CONTENT_CATEGORY_NOT_FOUND]);
      category = removeLocalizationField(category, 'title');
      const id = await context.commonContentCategory.update(category);
      if (!id) return formatError([contentCategoryError.CATEGORY_NOT_UPDATED]);

      let data = await context.commonContentCategory.getById(id);
      data = addLocalizationField(data, 'title');
      return {
        data
      };
    },
  },
  Query: {

    async getCommonContentCategory(root, data, context) {
      let contentCategory = await context.commonContentCategory.getById(data.id);
      contentCategory = addLocalizationField(contentCategory, 'title');
      return contentCategory;
    },

    async getCategoryAndContentBySlug(root, { slugs, countryId }, context) {
      const filters = {};
      filters.status = contentCategoryStatus.ACTIVE;
      if (countryId) {
        filters.countryId = countryId;
      }
      let contentCategories = await context.commonContentCategory.getBySlugs(slugs, filters);
      contentCategories = addLocalizationField(contentCategories, 'title');

      const promiseList = contentCategories.map(contentCategory => {
        const commonContents = context.commonContent.getByFilters(
          {
            commonContentCategoryId: contentCategory.id,
            status: contentStatus.ACTIVE
          });

        return {
          ...contentCategory,
          commonContents
        };
      });

      contentCategories = await Promise.all(promiseList);
      return contentCategories;
    },

    async getAllCommonContentCateogry(root, data, context) {
      let contentCategoriesArr = await context.commonContentCategory.getAll();
      contentCategoriesArr = contentCategoriesArr.map((contentCategory) => {
        return addLocalizationField(contentCategory, 'title');
      });
      return contentCategoriesArr;
    }
  }
};
