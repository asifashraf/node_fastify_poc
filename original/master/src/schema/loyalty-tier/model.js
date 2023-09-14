const BaseModel = require('../../base-model');
const { loyaltyTierSaveError, loyaltyTierStatus } = require('../root/enums');

class LoyaltyTier extends BaseModel {
  constructor(db, context) {
    super(db, 'loyalty_tiers', context);
  }
  async getBySku(sku) {
    const [loyaltyTier] = await this.db(this.tableName).where({ sku });
    return loyaltyTier;
  }
  async getById(id) {
    const loyaltyTiersQuery = this.db
      .select(
        `${this.tableName}.*`,
        'loyalty_bonuses.id as loyalty_bonus_id',
        'loyalty_bonuses.loyalty_tier_id',
        'loyalty_bonuses.type',
        'loyalty_bonuses.value',
        'loyalty_bonuses.lower_bound',
        'loyalty_bonuses.upper_bound'
      )
      .from(this.tableName)
      .leftJoin(
        'loyalty_bonuses',
        'loyalty_bonuses.loyalty_tier_id',
        `${this.tableName}.id`
      )
      .where(`${this.tableName}.id`, id);
    const flatResult = await this.context.sqlCache(loyaltyTiersQuery);

    if (!flatResult || flatResult.length === 0) {
      return null;
    }

    const loyaltyBonuses = [];
    flatResult.forEach(e => {
      if (e.loyaltyBonusId) {
        loyaltyBonuses.push({
          id: e.loyaltyBonusId,
          loyaltyTierId: e.loyaltyTierId,
          type: e.type,
          value: e.value,
          lowerBound: e.lowerBound,
          upperBound: e.upperBound,
        });
      }
    });
    return {
      id: flatResult[0].id,
      created: flatResult[0].created,
      updated: flatResult[0].updated,
      name: flatResult[0].name,
      sku: flatResult[0].sku,
      amount: flatResult[0].amount,
      status: flatResult[0].status,
      customAmount: flatResult[0].customAmount,
      minAmount: flatResult[0].minAmount,
      maxAmount: flatResult[0].maxAmount,
      colorTint: flatResult[0].colorTint,
      bonus: flatResult[0].bonus,
      countryId: flatResult[0].countryId,
      currencyId: flatResult[0].currencyId,
      sortOrder: flatResult[0].sortOrder,
      loyaltyBonuses,
    };
  }
  getAll(status) {
    const query = super.getAll();
    if (status !== 'ALL') query.where('status', status);
    return this.context.sqlCache(query.orderBy('sort_order', 'asc'));
  }
  async getAllByCountry(country, status) {
    if (
      Object.keys(country).length === 0 ||
      (!country.countryId && !country.countryCode)
    ) {
      return [];
    }
    let loyaltyTiersQuery = this.db
      .select(
        `${this.tableName}.*`,
        'loyalty_bonuses.id as loyalty_bonus_id',
        'loyalty_bonuses.loyalty_tier_id',
        'loyalty_bonuses.type',
        'loyalty_bonuses.value',
        'loyalty_bonuses.lower_bound',
        'loyalty_bonuses.upper_bound'
      )
      .from(this.tableName)
      .leftJoin(
        'loyalty_bonuses',
        'loyalty_bonuses.loyalty_tier_id',
        `${this.tableName}.id`
      );
    if (status !== 'ALL') {
      loyaltyTiersQuery.where(`${this.tableName}.status`, status);
    }
    if (country.countryId) {
      loyaltyTiersQuery = loyaltyTiersQuery.where(
        `${this.tableName}.country_id`,
        country.countryId
      );
    }
    if (country.countryCode) {
      loyaltyTiersQuery = loyaltyTiersQuery
        .leftJoin('countries', 'countries.id', `${this.tableName}.country_id`)
        .where('countries.iso_code', country.countryCode);
    }
    loyaltyTiersQuery = loyaltyTiersQuery.orderBy('sort_order', 'asc');
    const flatResult = await this.context.sqlCache(loyaltyTiersQuery);

    // Map flat rows into merged loyalty_tiers
    const resultMap = flatResult.reduce((result, row) => {
      result[row.id] = result[row.id] || {
        id: row.id,
        created: row.created,
        updated: row.updated,
        name: row.name,
        sku: row.sku,
        amount: row.amount,
        status: row.status,
        customAmount: row.customAmount,
        minAmount: row.minAmount,
        maxAmount: row.maxAmount,
        colorTint: row.colorTint,
        bonus: row.bonus,
        countryId: row.countryId,
        currencyId: row.currencyId,
        sortOrder: row.sortOrder,
        loyaltyBonuses: [],
      };

      if (row.loyaltyBonusId) {
        result[row.id].loyaltyBonuses.push({
          id: row.loyaltyBonusId,
          loyaltyTierId: row.loyaltyTierId,
          type: row.type,
          value: row.value,
          lowerBound: row.lowerBound,
          upperBound: row.upperBound,
        });
      }

      return result;
    }, {});

    return Object.values(resultMap);
  }
  async validate(loyaltyTierInput) {
    const errors = [];
    const loyaltyTier = await this.getBySku(loyaltyTierInput.sku);
    if (loyaltyTier && loyaltyTier.id !== loyaltyTierInput.id) {
      errors.push(loyaltyTierSaveError.DUPLICATE_SKU);
    }
    if (loyaltyTierInput.customAmount) {
      if (loyaltyTierInput.minAmount && loyaltyTierInput.maxAmount) {
        if (
          loyaltyTierInput.minAmount < 0 ||
          loyaltyTierInput.maxAmount < 0 ||
          loyaltyTierInput.minAmount >= loyaltyTierInput.maxAmount
        )
          errors.push(loyaltyTierSaveError.INVALID_MIN_AND_MAX_AMOUNT);
      } else errors.push(loyaltyTierSaveError.INVALID_CUSTOM_AMOUNT);
    }
    return errors;
  }

  async getAllByCountryWithLessFields(countryId) {
    let loyaltyTiersQuery = this.db
      .select(
        `${this.tableName}.id`,
        `${this.tableName}.amount`,
        `${this.tableName}.custom_amount`,
        `${this.tableName}.sort_order`,
        `${this.tableName}.bonus`,
        `${this.tableName}.name`,
        `${this.tableName}.sku`,
        'loyalty_bonuses.id as loyalty_bonus_id',
        'loyalty_bonuses.loyalty_tier_id',
        'loyalty_bonuses.type',
        'loyalty_bonuses.value'
      )
      .from(this.tableName)
      .leftJoin(
        'loyalty_bonuses',
        'loyalty_bonuses.loyalty_tier_id',
        `${this.tableName}.id`
      );

    loyaltyTiersQuery = loyaltyTiersQuery.where(
      `${this.tableName}.country_id`,
      countryId
    ).where(`${this.tableName}.status`, loyaltyTierStatus.ACTIVE);

    const flatResult = await this.context.sqlCache(loyaltyTiersQuery);

    // Map flat rows into merged loyalty_tiers
    const resultMap = flatResult.reduce((result, row) => {
      result[row.id] = result[row.id] || {
        id: row.id,
        amount: row.amount,
        customAmount: row.customAmount,
        minAmount: row.minAmount,
        maxAmount: row.maxAmount,
        status: row.status,
        bonus: row.bonus,
        sortOrder: row.sortOrder,
        name: row.name,
        sku: row.sku,
        loyaltyBonuses: [],
      };
      if (row.loyaltyBonusId) {
        result[row.id].loyaltyBonuses.push({
          id: row.loyaltyBonusId,
          loyaltyTierId: row.loyaltyTierId,
          type: row.type,
          value: row.value,
        });
      }
      return result;
    }, {});

    return Object.values(resultMap);
  }
}

module.exports = LoyaltyTier;
