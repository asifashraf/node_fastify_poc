/* eslint-disable camelcase */
/* const BaseModel = require('../../base-model');
const { cSubscriptionBrandSaveError, cSubscriptionBrandStatus } = require('./enum');
const { addPaging } = require('../../lib/util');

class CSubscriptionBrand extends BaseModel {
  constructor(db, context) {
    super(db, 'subscription_brands', context);
  }

  async getSubscriptionBrandByBrandIdAndSubscriptionId(brandId, subscriptionId) {
    const query = await this.roDb(this.tableName)
      .where('brand_id', brandId)
      .andWhere('subscription_id', subscriptionId)
      .first();
    return query;
  }

  async formatData(subscriptions) {
    for (const subscription of subscriptions) {
      if (!subscription.id) {
        const subBrand = await this.getSubscriptionBrandByBrandIdAndSubscriptionId(subscription.brandId, subscription.subscriptionId);

        if (subBrand) {
          subscription.id = subBrand.id;
        }

      }
      if (!subscription.status) {
        subscription.status = cSubscriptionBrandStatus.ACTIVE;
      }
    }

    return subscriptions;
  }

  async validateInput(subscriptions) {
    const errors = [];
    let subs = null;
    for (const subscription of subscriptions) {
      if (!subscription.subscriptionId || subscription.subscriptionId.trim() == '') {
        errors.push(cSubscriptionBrandSaveError.INVALID_SUBSCRIPTION);
        break;
      } else {
        subs = await this.context.cSubscription.getById(subscription.subscriptionId);
        if (!subs) {
          errors.push(cSubscriptionBrandSaveError.INVALID_SUBSCRIPTION);
          break;
        }
      }
      if (!subscription.brandId || subscription.brandId.trim() == '') {
        errors.push(cSubscriptionBrandSaveError.INVALID_BRAND);
        break;
      } else {
        const brand = await this.context.brand.getById(subscription.brandId);
        if (!brand) {
          errors.push(cSubscriptionBrandSaveError.INVALID_BRAND);
          break;
        } else {
          if (subs && subs.countryId != brand.countryId) {
            errors.push(cSubscriptionBrandSaveError.INVALID_COUNTRY);
          }
        }
      }
    }
    return errors;
  }

  getQueryByFilters(filters, paging) {
    let query = this.db(this.tableName)
      .orderBy('created', 'desc');
    if (filters) {
      query = query.where(filters);
    }
    //if (!filters?.status) {
    //  query = query.where('status', cSubscriptionBrandStatus.ACTIVE);
    //}
    if (paging) {
      query = addPaging(query, paging);
    }
    return query;
  }

}

module.exports = CSubscriptionBrand;
 */
