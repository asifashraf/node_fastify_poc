const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');

class BlogCategory extends BaseModel {
  constructor(db, context) {
    super(db, 'blog_category', context);
    this.loaders = createLoaders(this);
  }

  getAll({status}) {
    const query = super.getAll().orderBy('updated', 'DESC');
    if (status) query.where('status', status);
    return query;
  }
}

module.exports = BlogCategory;
