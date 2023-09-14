const { find, includes, values, map, difference, filter } = require('lodash');

const BaseModel = require('../../base-model');
const { couponType } = require('../root/enums');

class CouponDetail extends BaseModel {
  constructor(db, context) {
    super(db, 'coupon_details', context);
  }

  getAllByCoupon(couponId) {
    return this.db(this.tableName).where('coupon_id', couponId);
  }

  async getCostReductionCouponDetail(couponId) {
    // PERCENTAGE or FLAT_AMOUNT
    return find(await this.getAllByCoupon(couponId), c =>
      includes([couponType.PERCENTAGE, couponType.FLAT_AMOUNT], c.type)
    );
  }

  async getFreePerksCouponDetails(couponId) {
    // FREE_DELIVERY, FREE_DRINK or FREE_FOOD
    return filter(await this.getAllByCoupon(couponId), c =>
      includes(
        [couponType.FREE_DELIVERY, couponType.FREE_DRINK, couponType.FREE_FOOD],
        c.type
      )
    );
  }
  async allowedCouponTypes(couponId) {
    const couponTypes = values(couponType);
    let usedTypes = await this.getAll()
      .select(`${this.tableName}.type`)
      .where(`${this.tableName}.coupon_id`, couponId);

    usedTypes = map(usedTypes, n => n.type.trim());
    if (usedTypes.indexOf(couponType.FLAT_AMOUNT) !== -1) {
      couponTypes.splice(couponTypes.indexOf(couponType.PERCENTAGE), 1);
    }
    if (usedTypes.indexOf(couponType.PERCENTAGE) !== -1) {
      couponTypes.splice(couponTypes.indexOf(couponType.FLAT_AMOUNT), 1);
    }
    return difference(couponTypes, usedTypes);
  }
}

module.exports = CouponDetail;
