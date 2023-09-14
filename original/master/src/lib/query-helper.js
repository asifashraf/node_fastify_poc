const { get } = require('lodash');

const { itemsPerPage } = require('../../config');
const db = require('../../database');

/**
 * @deprecated
 * use queryHelper from BaseModel
 */
class QueryHelper {
  constructor(query) {
    this.query = query;
    this.limit = itemsPerPage;
    this.offset = 0;
    return this;
  }

  addPaging(paging) {
    this.limit = get(paging, 'limit', itemsPerPage);
    this.offset = get(paging, 'offset', 0);
    this.query.limit(this.limit).offset(this.offset);
    return this;
  }

  addCounting() {
    this.query.select(db.raw('count(*) OVER() AS "total_items"'));
    return this;
  }

  getQuery() {
    return this.query;
  }

  async resolvePagedQuery() {
    const results = await this.getQuery();
    const totalItems = results.length ? results[0].totalItems : 0;
    const totalPages = totalItems > 0 ? Math.ceil(totalItems / this.limit) : 0;
    const currentPage = this.offset
      ? Math.round(this.offset / this.limit) + 1
      : 1;
    return {
      paging: {
        totalItems,
        totalPages,
        currentPage,
      },
      items: results,
    };
  }
}

module.exports = QueryHelper;
