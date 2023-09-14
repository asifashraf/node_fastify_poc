const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');
const {
  signupPromoError,
  statusTypes,
  loyaltyTransactionType,
  // signupPromos,
} = require('../root/enums');
const { generateShortCode, transformToCamelCase } = require('../../lib/util');
const { omit, first } = require('lodash');

class SignupPromo extends BaseModel {
  constructor(db, context) {
    super(db, 'signup_promos', context);
    this.loaders = createLoaders(this);
  }

  filterPromos(query, filters) {
    if (typeof filters.status === 'undefined') {
      filters.status = 'ALL';
    }
    if (filters.status !== 'ALL') {
      query.where('signup_promos.status', filters.status);
    }

    if (filters.searchText) {
      filters.searchText = filters.searchText.toLowerCase().trim();
      query.whereRaw(
        '(LOWER(signup_promos.type) like ? or LOWER(signup_promos.code) like ? )'
        , [`%${filters.searchText}%`, `%${filters.searchText}%`],
      );
    }
    return query;
  }

  getByCode(code) {
    return this.db(this.tableName)
      .where('code', code)
      .then(transformToCamelCase)
      .then(first);
  }
  getByType(type) {
    return this.db(this.tableName)
      .where('type', type)
      .then(transformToCamelCase);
  }

  async getAll(filters) {
    let query = super.getAll();

    query = this.filterPromos(query, filters);

    return this.context.sqlCache(query);
  }

  async getAllActive() {
    return super.getAll().where('status', statusTypes.ACTIVE);
  }

  async generatePromoCode() {
    const getUniqueShortCode = async () => {
      const code = generateShortCode(10);
      const promo = await this.getByCode(code);
      if (!promo) {
        return code;
      }
      return getUniqueShortCode();
    };

    return getUniqueShortCode();
  }

  async validateCreate(input) {
    const errors = [];

    if (input.id) {
      const promo = await this.getById(input.id);

      if (!promo) {
        errors.push(signupPromoError.INVALID_SIGNUP_PROMO);
      }
    }

    const currency = await this.context.currency.getByCode(input.currencyCode);
    const country = await this.context.country.getByCode(input.countryCode);
    if (!currency) {
      errors.push(signupPromoError.INVALID_CURRENCY);
    }
    if (!country) {
      errors.push(signupPromoError.INVALID_COUNTRY);
    }

    return errors;
  }

  async validateUpdate(input) {
    const errors = [];

    const promo = await this.getById(input.id);

    if (!promo) {
      errors.push(signupPromoError.INVALID_SIGNUP_PROMO);
    }

    return errors;
  }

  async create(input) {
    if (input.id) {
      input = omit(input, [
        'type',
        'rewardAmount',
        'countryCode',
        'currencyCode',
      ]);
    } else {
      input.code = await this.generatePromoCode();

      const currency = await this.context.currency.getByCode(
        input.currencyCode
      );
      const country = await this.context.country.getByCode(input.countryCode);

      input = omit(input, ['countryCode', 'currencyCode']);

      input.currencyId = currency.id;
      input.countryId = country.id;
    }

    const promoId = await super.save(input);
    return this.getById(promoId);
  }

  async update(input) {
    await super.save(input);
    return this.getById(input.id);
  }

  async rewardCustomerWithSignupPromo(customer, promo) {
    const errors = [];

    if (promo) {
      const signupPromo = await this.context.signupPromo.getByCode(promo.code);
      if (signupPromo && signupPromo.status === 'ACTIVE') {
        if (customer.country_id === signupPromo.countryId) {
          await this.context.loyaltyTransaction.credit(
            signupPromo.id,
            loyaltyTransactionType.SIGNUP_PROMO,
            customer.id,
            signupPromo.rewardAmount ? signupPromo.rewardAmount : 0,
            signupPromo.currencyId
          );
          await this.context.customer.save({
            id: customer.id,
            signupPromoId: signupPromo.id,
          });
        }
      }
    }

    return { errors };
  }

  async getByCountry(countryId, filters) {
    let query = this.db(this.tableName)
      .where('country_id', countryId);

    query = this.filterPromos(query, filters);

    return this.context.sqlCache(query);
  }
}

module.exports = SignupPromo;
