/* eslint-disable camelcase */
const BaseModel = require('../../base-model');

const { suggestBrandSaveError } = require('./enums');
const { suggestBrandSlackUrl } = require('../../../config');
const SlackWebHookManager = require('../slack-webhook-manager/slack-webhook-manager');

class SuggestBrand extends BaseModel {
  constructor(db, context) {
    super(db, 'suggest_brands', context);
  }

  async validate(shopName, location, isOwner) {
    if (!shopName || !location || isOwner === null || isOwner === undefined) {
      return suggestBrandSaveError.INVALID_INPUT;
    }
    if (shopName.length < 3 || shopName.length > 140) {
      return suggestBrandSaveError.INVALID_INPUT;
    }
    if (location.length < 3 || location.length > 140) {
      return suggestBrandSaveError.INVALID_INPUT;
    }
  }

  async saveSuggestBrand({ shopName, location, isOwner, customerId }) {
    const suggestBrand = { shopName, location, isOwner, customerId };
    const ret = await this.save(suggestBrand);
    const customer = await this.context.customer.getById(customerId);
    if (isOwner) {
      SlackWebHookManager.sendTextToSlack(
        `
            [!!! New Coffee Shop Suggested !!!]
            Shop Name: ${suggestBrand.shopName}
            Location: ${suggestBrand.location}
            Owner: ${suggestBrand.isOwner}
            Customer id: ${suggestBrand.customerId}
            Customer Name: ${customer.firstName + ' ' + customer.lastName} 
            Customer Phone: ${customer.phoneNumber}
            Customer Country: ${customer.phoneCountry}
            `, suggestBrandSlackUrl);
    } else {
      SlackWebHookManager.sendTextToSlack(
        `
            [!!! New Coffee Shop Suggested !!!]
            Shop Name: ${suggestBrand.shopName}
            Location: ${suggestBrand.location}
            Owner: ${suggestBrand.isOwner}
            customerId: ${suggestBrand.customerId}
            Customer Country: ${customer.phoneCountry}
            `, suggestBrandSlackUrl);
    }
    return { error: null, saved: !!ret };

  }
}


module.exports = SuggestBrand;
