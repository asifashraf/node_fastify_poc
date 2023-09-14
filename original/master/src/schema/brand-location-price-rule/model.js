const { uniq, flatten, map } = require('lodash');
const BaseModel = require('../../base-model');
const { appendSortOrderToList } = require('../../lib/util');
const { brandLocationPriceRuleError } = require('../root/enums');
const { invalidateMenuForBrandLocation } = require('../c-menu/utils');

class BrandLocationPriceRule extends BaseModel {
  constructor(db, context) {
    super(db, 'brand_location_price_rules', context);
  }

  async validate(brandLocationPriceRuleInputs) {
    const context = this.context;
    const validateBrandLocationPriceRuleInputs = async brandLocationPriceRuleInput => {
      const errors = [];
      const brandLocation = await context.brandLocation.getById(
        brandLocationPriceRuleInput.brandLocationId
      );

      if (!brandLocation) {
        errors.push(brandLocationPriceRuleError.INVALID_BRAND_LOCATION);
      }

      return errors;
    };

    return uniq(
      flatten(
        await Promise.all(
          map(
            brandLocationPriceRuleInputs,
            validateBrandLocationPriceRuleInputs
          )
        )
      )
    );
  }

  async save(priceRules) {
    const result = await super.save(
      appendSortOrderToList(priceRules, 'brandLocationId', 'sort_order')
    );
    const { brandLocationId } = priceRules[0];
    await invalidateMenuForBrandLocation.apply({ db: this.db }, [
      brandLocationId,
    ]);
    return result;
  }

  getByBrandLocation(brandLocationId) {
    return this.db(this.tableName)
      .where('brand_location_id', brandLocationId)
      .orderBy('sort_order', 'ASC');
  }
}

module.exports = BrandLocationPriceRule;
