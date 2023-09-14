const BaseModel = require('../../base-model');

class Tower extends BaseModel {
  constructor(db) {
    super(db, 'towers');
  }

  async getAll() {
    return this.db(this.tableName).orderBy('name', 'ASC');
  }
}

module.exports = Tower;
