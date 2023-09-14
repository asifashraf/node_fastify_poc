const BaseModel = require('../../base-model');

class Kiosk extends BaseModel {
  constructor(db, context) {
    super(db, 'kiosks', context);
  }
}

module.exports = Kiosk;
