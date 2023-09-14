const BaseModel = require('../../base-model');
const { saveSplashCategoryError } = require('./enums');

class SplashCategory extends BaseModel {
  constructor(db, context) {
    super(db, 'splash_category', context);
  }

  async validateInput(input) {
    const errors = [];
    const uuidV4Format = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (input.name && input.name.trim() == '') {
      errors.push(saveSplashCategoryError.INVALID_NAME);
    }
    if (input.id) {
      if (input.id.trim() == '' || !input.id.match(uuidV4Format)) {
        errors.push(saveSplashCategoryError.INVALID_ID);
      } else {
        const category = await this.getById(input.id);
        if (!category) {
          errors.push(saveSplashCategoryError.INVALID_ID);
        }
      }
    }
    if (input.isActive) {
      const activeCategory = await this.getActiveCategory();
      if (activeCategory) {
        if (input.id) {
          if (activeCategory.id != input.id) {
            errors.push(saveSplashCategoryError.ALREADY_ACTIVE_CATEGORY);
          }
        } else {
          errors.push(saveSplashCategoryError.ALREADY_ACTIVE_CATEGORY);
        }
      }
    }
    return { errors };
  }

  async getActiveCategory() {
    return this.db(this.tableName)
      .where('is_active', true)
      .first();
  }

}

module.exports = SplashCategory;
