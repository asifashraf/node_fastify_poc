/* eslint-disable camelcase */

const BaseModel = require('../../base-model');


class CommonContentCategory extends BaseModel {

  constructor(db, context) {

    super(db, 'common_content_category', context);

  }

  update(commonContentCategory) {
    return super.save(commonContentCategory);
  }

  getQueryByFilters(filters) {
    return this.db(this.tableName).andWhere(filters);
  }

  getBySlugs(slugs, filters) {
    const query = this.db(this.tableName).whereIn('slug', slugs);
    if (filters) query.where(filters);
    return query;
  }

}


module.exports = CommonContentCategory;
