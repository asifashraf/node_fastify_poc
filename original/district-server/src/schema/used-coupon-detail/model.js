const BaseModel = require('../../base-model');

class UsedCouponDetail extends BaseModel {
  constructor(db, context) {
    super(db, 'used_coupon_details', context);
  }

  getAllUsedOn(usedOn, referenceId) {
    return this.db(this.tableName)
      .where('reference_id', referenceId)
      .where('used_on', usedOn);
  }
}

module.exports = UsedCouponDetail;
