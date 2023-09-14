const BaseModel = require('../../base-model');

class Allergen extends BaseModel {
  constructor(db) {
    super(db, 'allergens');
  }
}

module.exports = Allergen;
