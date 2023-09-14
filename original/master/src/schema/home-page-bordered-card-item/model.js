const BaseModel = require('../../base-model');


class BorderedCardItem extends BaseModel {
  constructor(db, context) {
    super(db, 'brand_locations', context);
  }

}

module.exports = BorderedCardItem;
