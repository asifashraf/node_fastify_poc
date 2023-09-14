const BaseModel = require('../../base-model');

class BrandLocationFacility extends BaseModel {
  constructor(db, context) {
    super(db, 'brand_location_facilities', context);
  }
  getByBrandLocation(brandLocationId) {
    return this.db(this.tableName)
      .where('brand_location_id', brandLocationId)
      .orderBy('type', 'ASC');
  }

  saveFacilityByBrandLocation(brandLocationId, facilityType) {
    return super.save({
      brandLocationId,
      type: facilityType,
    });
  }

  deleteByBrandLocation(brandLocationId) {
    return this.db(this.tableName)
      .where('brand_location_id', brandLocationId)
      .delete();
  }
}
module.exports = BrandLocationFacility;
