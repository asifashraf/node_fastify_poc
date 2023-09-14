/* eslint-disable camelcase */
const BaseModel = require('../../base-model');
const { CSubscriptionWeeklyOfferSaveError } = require('./enum');
const { addPaging, addLocalizationField } = require('../../lib/util');

class CSubscriptionWeeklyOffer extends BaseModel {
  constructor(db, context) {
    super(db, 'subscription_weekly_offers', context);
  }

  async validateInput(input) {
    const errors = [];
    if (!input.brandId || input.brandId.trim() == '') {
      errors.push(CSubscriptionWeeklyOfferSaveError.INVALID_BRAND);
    } else {
      const brand = await this.context.brand.getById(input.brandId);
      if (!brand) {
        errors.push(CSubscriptionWeeklyOfferSaveError.INVALID_BRAND);
      } else {
        const country = await this.context.country.getById(brand.countryId);
        if (!country) {
          errors.push(CSubscriptionWeeklyOfferSaveError.INVALID_COUNTRY);
        } else {
          input.countryId = country.id;
          if (input.sortOrder != null) {
            const availableOffers = await this.getQueryByFilters({ countryId: country.id, sortOrder: input.sortOrder });
            if (availableOffers && availableOffers.length != 0) {
              errors.push(CSubscriptionWeeklyOfferSaveError.SORT_ORDER_ALREADY_EXIST);
            }
          }
        }
      }
    }
    return { input, errors };
  }


  async getById(id) {
    const weeklyOffer = await super.getById(id);
    return addLocalizationField(
      weeklyOffer,
      'imageUrl'
    );
  }

  async getQueryByFilters(filters, paging) {
    let query = this.db(this.tableName)
      .orderBy('sort_order', 'asc');
    if (filters) {
      query = query.where(filters);
    }
    if (paging) {
      query = addPaging(query, paging);
    }
    return addLocalizationField(
      await query,
      'imageUrl'
    );
  }
}


module.exports = CSubscriptionWeeklyOffer;
