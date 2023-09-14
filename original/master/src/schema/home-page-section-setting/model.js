const BaseModel = require('../../base-model');

class HomePageSectionSetting extends BaseModel {
  constructor(db, context) {
    super(db, 'home_page_section_settings', context);
  }


  getQueryByFilters(filters) {
    let query = this.db(this.tableName)
      .orderBy('created', 'desc');
    if (filters) {
      query = query.where(filters);
    }
    return query;
  }

}

module.exports = HomePageSectionSetting;
