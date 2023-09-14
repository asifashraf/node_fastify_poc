const BaseModel = require('../../base-model');
const { saveSplashCategoryContentError, splashError, language, splashSize, platform } = require('./enums');
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
      errors.push(saveSplashCategoryContentError.INVALID_CATEGORY_ID);
      return { errors };
    }
    if (!this.isAllCombinationExist(contents)) {
      errors.push(saveSplashCategoryContentError.MISSING_URL);
      return { errors };
    }
    for (const input of contents) {
      if (input.url && input.url.trim() == '') {
        errors.push(saveSplashCategoryContentError.MISSING_URL);
      }
      if (input.categoryId) {
        if (input.categoryId.trim() == '' || !input.categoryId.match(uuidV4Format)) {
          errors.push(saveSplashCategoryContentError.INVALID_CATEGORY_ID);
        } else {
          const category = await this.context.splashCategory.getById(input.categoryId);
          if (!category) {
            errors.push(saveSplashCategoryContentError.INVALID_CATEGORY_ID);
          }
        }
      }
      if (!input.id) {
        const content = await this.getContentByFilters({ platform: input.platform, size: input.size, language: input.language, categoryId: input.categoryId });
        if (content && content.length > 0) {
          errors.push(saveSplashCategoryContentError.ALREADY_EXIST);
        }
      }
    }
    return { errors };
  }


  isAllCombinationExist(input) {
    let count = 0;
    for (const p of Object.keys(platform)) {
      for (const l of Object.keys(language)) {
        let sizes = Object.keys(splashSize);
        if (p == platform.IOS) {
          sizes = ['MEDIUM', 'LARGE'];
        }
        for (const size of sizes) {
          const isFound = find(input, i => i.size == size && i.platform == p && i.language == l);
          if (isFound) {
            count += 1;
          }
        }
      }
    }
    if (count == 12) {
      return true;
    }
    return false;
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
