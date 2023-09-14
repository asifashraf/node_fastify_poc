const { addLocalizationField, formatError, removeLocalizationField } = require('../../lib/util');
const { omit } = require('lodash');
const { contentCategoryStatus } = require('../common-content-category/enum');
const { contentStatus, commonContentError } = require('./enum');

module.exports = {
  Mutation: {

    async saveCommonContent(root, { commonContent }, context) {
      const commonContentCategory = await context.commonContentCategory.getById(commonContent.commonContentCategoryId);
      if (!commonContentCategory) {
        //error enum to be added
        return formatError([commonContentError.INVALID_COMMON_CONTENT_CATEGORY]);
      }
      commonContent = removeLocalizationField(commonContent, 'title');
      commonContent = removeLocalizationField(commonContent, 'subtitle');
      commonContent = removeLocalizationField(commonContent, 'description');
      const commonContentId = await context.commonContent.save(commonContent);

      let data = await context.commonContent.getById(commonContentId);
      data = addLocalizationField(data, 'title');
      data = addLocalizationField(data, 'subtitle');
      data = addLocalizationField(data, 'description');
      return {
        data
      };
    },

    async updateCommonContent(root, { commonContent }, context) {
      const contentItem = await context.commonContent.getById(commonContent.id);
      if (!contentItem) return formatError([commonContentError.COMMON_CONTENT_NOT_FOUND]);
      commonContent = removeLocalizationField(commonContent, 'title');
      commonContent = removeLocalizationField(commonContent, 'subtitle');
      commonContent = removeLocalizationField(commonContent, 'description');
      const id = await context.commonContent.update(commonContent);
      if (!id) return formatError([commonContentError.CONTENT_NOT_UPDATED]);

      let data = await context.commonContent.getById(id);
      data = addLocalizationField(data, 'title');
      data = addLocalizationField(data, 'subtitle');
      data = addLocalizationField(data, 'description');
      return {
        data
      };
    },
  },
  Query: {
    async getCommonContentByFilters(root, { filters }, context) {
      let data;
      if (filters.slug) {
        const contentCategories = await context.commonContentCategory.getQueryByFilters({ slug: filters.slug, status: contentCategoryStatus.ACTIVE });
        const contentCategoryIds = contentCategories.map(category => category.id);
        filters = omit(filters, [
          'slug'
        ]);

        if (!filters.commonContentCategoryId) {
          filters.commonContentCategoryId = contentCategoryIds;
        } else {
          filters.commonContentCategoryId = contentCategoryIds.find(contentCategoryId => contentCategoryId === filters.commonContentCategoryId) || '';
        }

        if (!filters.commonContentCategoryId || !filters.commonContentCategoryId.length) {
          data = [];
        } else {
          data = await context.commonContent.getByFilters({...filters, status: contentStatus.ACTIVE});
        }
      } else {
        data = await context.commonContent.getByFilters({...filters, status: contentStatus.ACTIVE});
      }
      return data;
    },

    async getCommonContentById(root, { id }, context) {
      return await context.commonContent.getById(id);
    },
  }
};
