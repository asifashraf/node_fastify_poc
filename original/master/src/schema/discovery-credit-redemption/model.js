const BaseModel = require('../../base-model');
const { first } = require('lodash');
const moment = require('moment');

class DiscoveryCreditRedemption extends BaseModel {
  constructor(db, context) {
    super(db, 'discovery_credit_redemptions', context);
  }
  async usedByBrand(discoveryCreditId, brandId) {
    const list = await this.getAll()
      .where('discovery_credit_id', discoveryCreditId)
      .where('brand_id', brandId);
    return list;
  }

  async usedByBrandAndOrder(
    discoveryCreditId,
    brandId,
    referenceOrderId,
    refunded = false
  ) {
    const list = first(
      await this.getAll()
        .where('discovery_credit_id', discoveryCreditId)
        .where('reference_order_id', referenceOrderId)
        .where('brand_id', brandId)
        .where('refunded', refunded)
    );
    return list;
  }

  async countUsedByBrand(discoveryCreditId, brandId) {
    const redemptionCount = first(
      await this.getAll()
        .count('id')
        .where('discovery_credit_id', discoveryCreditId)
        .where('refunded', false)
        .where('brand_id', brandId)
    );
    return redemptionCount ? Number(redemptionCount.count) : 0;
  }

  async discoveryCreditAvailable({ brandId, countryId, customerId }) {
    if (!brandId || !countryId) {
      return false;
    }

    const expiresOn = await this.context.discoveryCredit.getDiscoveryCreditExpiryTime(countryId);
    if (moment.unix(expiresOn).isBefore(moment())) return false;

    if (!customerId) {
      return true;
    }

    const dc = await this.context.discoveryCredit.getByCustomerAndCountryId(
      customerId,
      countryId
    );
    if (!dc) {
      return false;
    }
    const redemptionCount = await this.countUsedByBrand(dc.id, brandId);
    if (redemptionCount < Number(dc.noOfOrdersPerBrand)) {
      return true;
    }
    return false;
  }
}

module.exports = DiscoveryCreditRedemption;
