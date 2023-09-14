const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');
const isUUID = require('is-uuid');
const { statusTypes } = require('../root/enums');
const { transformToCamelCase } = require('../../lib/util');
const { first } = require('lodash');

class BlogPost extends BaseModel {
  constructor(db, context) {
    super(db, 'blog_post', context);
    this.loaders = createLoaders(this);
  }

  getByIdOrPermalink(id) {
    const field = isUUID.v4(id) ? 'id' : 'permalink';
    return this.db(this.tableName)
      .where(field, id)
      .andWhere('status', statusTypes.ACTIVE)
      .then(transformToCamelCase)
      .then(first);
  }

  getFiltered({ offset, limit, search, category }) {
    let query = this.getAll()
      .select(this.db.raw(`${this.tableName}.*`))
      .where('status', statusTypes.ACTIVE);
    if (search) {
      query = query.where('title', 'ilike', `%${search}%`);
    }
    if (category) {
      query = query.where('category_id', category);
    }
    return this.queryHelper(query)
      .addPaging({ offset, limit })
      .addCounting()
      .resolvePagedQuery();
  }
}

module.exports = BlogPost;
