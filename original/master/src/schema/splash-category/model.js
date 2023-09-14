const BaseModel = require('../../base-model');
const { saveSplashCategoryError } = require('./enums');

class SplashCategory extends BaseModel {
  constructor(db, context) {
    super(db, 'splash_category', context);
  }

  async validateInput(input) {
    const errors = [];
    if (input.name && input.name.trim() == '') {
      errors.push(saveSplashCategoryError.INVALID_NAME);
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
