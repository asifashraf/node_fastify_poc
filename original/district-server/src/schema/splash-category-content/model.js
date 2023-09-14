const BaseModel = require('../../base-model');
const { saveSplashCategoryContentError, splashError, language, splashSize, platform, splashCategoryContentType } = require('./enums');
const { find, map, uniq } = require('lodash');

class SplashCategoryContent extends BaseModel {
  constructor(db, context) {
    super(db, 'splash_category_contents', context);
  }

  async validateInput(contents) {
    const errors = [];
    const uuidV4Format = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const categoryIds = uniq(map(contents, c => c.categoryId));
    if (categoryIds && categoryIds.length > 1) {
      errors.push({ error: saveSplashCategoryContentError.INVALID_CATEGORY_ID, type: splashCategoryContentType.GENERAL });
      return { errors };
    }
    const combinationErrors = this.isAllCombinationExist(contents);
    if (combinationErrors && combinationErrors.length > 0) {
      return { errors: combinationErrors };
    }
    let type = '';
    for (const input of contents) {
      type = input.platform + '_' + input.size + '_' + input.language;
      if (!input.url || input.url.trim() == '') {
        errors.push({ error: saveSplashCategoryContentError.MISSING_URL, type });
      }
      if (input.id) {
        if (input.id.trim() == '' || !input.id.match(uuidV4Format)) {
          errors.push({ error: saveSplashCategoryContentError.INVALID_ID, type });
        } else {
          const content = await this.getById(input.id);
          if (!content) {
            errors.push({ error: saveSplashCategoryContentError.INVALID_ID, type });
          }
        }
      }
      if (input.categoryId) {
        if (input.categoryId.trim() == '' || !input.categoryId.match(uuidV4Format)) {
          errors.push({ error: saveSplashCategoryContentError.INVALID_CATEGORY_ID, type });
        } else {
          const category = await this.context.splashCategory.getById(input.categoryId);
          if (!category) {
            errors.push({ error: saveSplashCategoryContentError.INVALID_CATEGORY_ID, type });
          } else {
            if (!input.id) {
              const content = await this.getContentByFilters({ platform: input.platform, size: input.size, language: input.language, categoryId: input.categoryId });
              if (content && content.length > 0) {
                errors.push({ error: saveSplashCategoryContentError.ALREADY_EXIST, type });
              }
            }
          }
        }
      }
    }
    return { errors };
  }


  isAllCombinationExist(input) {
    let type = '';
    const error = saveSplashCategoryContentError.MISSING_URL;
    const errors = [];
    for (const p of Object.keys(platform)) {
      for (const l of Object.keys(language)) {
        let sizes = Object.keys(splashSize);
        if (p == platform.IOS) {
          sizes = ['MEDIUM', 'LARGE'];
        }
        for (const size of sizes) {
          const isFound = find(input, i => i.size == size && i.platform == p && i.language == l);
          if (!isFound) {
            type = p + '_' + size + '_' + l;
            errors.push({ type, error });
          }
        }
      }
    }
    return errors;
  }

  async getActiveSplashContent({ platform, language, size }) {
    const category = await this.context.splashCategory.getActiveCategory();
    if (category) {
      const query = this.getContentByFilters({ platform, language, size });
      const content = await query
        .where('category_id', category.id)
        .first();
      if (content) {
        return { error: null, url: content.url };
      }
      return { error: splashError.NOT_FOUND, url: null };
    }
    return { error: splashError.NOT_FOUND, url: null };
  }


  getContentByFilters(filters) {
    const query = this.db(this.tableName)
      .where(filters);
    return query;
  }

}

module.exports = SplashCategoryContent;
