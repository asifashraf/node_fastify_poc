/* eslint-disable camelcase */
const BaseModel = require('../../base-model');
const { customerFavoriteBrandLocationError } = require('../root/enums');

class CustomerFavoriteBrandLocation extends BaseModel {
  constructor(db, context) {
    super(db, 'customer_favorite_brand_locations', context);
  }

  getByCustomerId(customerId) {
    return this.db(this.tableName)
      .where('customer_id', customerId)
      .orderBy('created');
  }
  getByBrandLocationId(brandLocationId) {
    return this.db(this.tableName)
      .where('brand_location_id', brandLocationId)
      .orderBy('created');
  }
  deleteByCustomerIdAndBrandLocationId(customerId, brandLocationId) {
    return this.db(this.tableName)
      .where({ brand_location_id: brandLocationId, customer_id: customerId })
      .del();
  }
  getByCustomerIdAndBrandLocationId(customerId, brandLocationId) {
    return this.db(this.tableName)
      .where({ brand_location_id: brandLocationId, customer_id: customerId })
      .orderBy('created');
  }
  async validateCustomerFavoriteBrandLocation(
    customerId,
    brandLocationId,
    addFavorite
  ) {
    const errors = [];
    const customer = await this.context.customer.getById(customerId);
    if (!customer.id) {
      errors.push(customerFavoriteBrandLocationError.INVALID_CUSTOMER);
    }
    const brandLocation = await this.context.brandLocation.getById(
      brandLocationId
    );
    if (!brandLocation.id) {
      errors.push(customerFavoriteBrandLocationError.INVALID_BRAND_LOCATION);
    }
    const customerFavoriteBrandLocation = await this.context.customerFavoriteBrandLocation.getByCustomerIdAndBrandLocationId(
      customerId,
      brandLocationId
    );
    if (customerFavoriteBrandLocation.length > 0 && addFavorite) {
      errors.push(
        customerFavoriteBrandLocationError.ALREADY_FAVORITED_BRAND_LOCATION
      );
    }
    if (customerFavoriteBrandLocation.length === 0 && !addFavorite) {
      errors.push(
        customerFavoriteBrandLocationError.INVALID_FAVORITED_BRAND_LOCAITON
      );
    }
    return errors;
  }
  async save(customerId, brandLocationId) {
    return super.save({ customerId, brandLocationId });
  }
}

module.exports = CustomerFavoriteBrandLocation;
