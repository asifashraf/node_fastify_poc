const BaseModel = require('../../base-model');
const { loyaltyBonusSaveError } = require('../root/enums');
const { isNullOrUndefined } = require('../../lib/util');

class LoyaltyBonus extends BaseModel {
  constructor(db, context) {
    super(db, 'loyalty_bonuses', context);
  }
  getByLoyaltyTierId(loyaltyTierId) {
    return this.db(this.tableName)
      .where('loyalty_tier_id', loyaltyTierId)
      .orderBy('lower_bound', 'asc');
  }

  deleteByIds(ids) {
    return this.db(this.tableName)
      .whereIn('id', ids)
      .del();
  }

  validate(loyaltyBonuses, loyaltyTierType) {
    const errors = [];

    loyaltyBonuses.forEach(lb => {
      if (!this.areBoundsValid(lb)) {
        errors.push(loyaltyBonusSaveError.INVALID_LOYALTY_BONUS_BOUNDS);
      }
    });

    if (loyaltyTierType === 'FIXED') {
      // FIXED
      if (loyaltyBonuses.length > 1) {
        errors.push(
          loyaltyBonusSaveError.ONE_BONUS_ALLOWED_FOR_FIXED_LOYALTY_TIER
        );
      }
    } else if (this.isOverlap(loyaltyBonuses)) {
      // CUSTOM
      errors.push(loyaltyBonusSaveError.OVERLAPPING_BONUS_BOUNDS);
    }
    return errors;
  }

  areBoundsValid(loyaltyBonus) {
    return (
      isNullOrUndefined(loyaltyBonus.upperBound) ||
      loyaltyBonus.upperBound >= loyaltyBonus.lowerBound
    );
  }

  isOverlap(loyaltyBonuses) {
    // Sort loyaltyBonuses in increasing order of lower bound
    loyaltyBonuses.sort((a, b) => (a.lowerBound >= b.lowerBound ? 1 : -1));

    // Check for overlap
    for (let i = 1; i < loyaltyBonuses.length; i++) {
      if (
        !isNullOrUndefined(loyaltyBonuses[i - 1].upperBound) &&
        loyaltyBonuses[i - 1].upperBound > loyaltyBonuses[i].lowerBound
      )
        return true;
    }
    // If we reach here, then no overlap
    return false;
  }
}

module.exports = LoyaltyBonus;
