const BaseModel = require('../../base-model');

class InvalidCouponAttemps extends BaseModel {
  constructor(db, context) {
    super(db, 'invalid_coupon_attempts', context);
  }
}

module.exports = InvalidCouponAttemps;
