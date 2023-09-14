const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');
const { addLocalizationField } = require('../../lib/util');
const { redisTimeParameter } = require('../../../config');

class Currency extends BaseModel {
  constructor(db, context) {
    super(db, 'currencies', context);
    this.loaders = createLoaders(this);
  }

  filterCurrencies(query, filters) {
    if (typeof filters.status === 'undefined') {
      filters.status = 'ALL';
    }
    if (filters.status !== 'ALL') {
      query.where('currencies.status', filters.status);
    }

    if (filters.searchText) {
      filters.searchText = filters.searchText.toLowerCase().trim();
      query.whereRaw(
        '(LOWER(currencies.iso_code) like ? or LOWER(currencies.symbol) like ? or currencies.symbol_ar like ? or currencies.symbol_tr like ? or LOWER(currencies.name) like ? )'
        , [`%${filters.searchText}%`, `%${filters.searchText}%`, `%${filters.searchText}%`, `%${filters.searchText}%`, `%${filters.searchText}%`],
      );
    }
    return query;
  }

  async getByCode(code) {
    let query = this.db(this.tableName);
    if (code) {
      query = query.where('iso_code', code);
    } else {
      query = query.where('iso_code', 'KD').orWhere('iso_code', 'KWD');
    }
    const [currency] = await query;
    return currency;
  }

  async getByCurrencyId(currencyId) {
    let query = this.db(this.tableName);

    query = query.where('id', currencyId);

    const [currency] = await query;
    return currency;
  }

  async getAll(filters) {
    let query = super.getAll();
    query = this.filterCurrencies(query, filters);
    const rsp = await query;
    return addLocalizationField(
      addLocalizationField(rsp, 'symbol'),
      'subunitName'
    );
  }

  async validate() {
    const errors = [];

    return errors;
  }

  async getCountry(currencyId) {
    const [country] = await this.context.sqlCache(
      this.db
        .select('countries.*')
        .from('countries')
        .leftJoin('currencies', 'currencies.id', 'countries.currency_id')
        .where('currencies.id', currencyId)
        .limit(1),
      redisTimeParameter.oneHourInSeconds
    );
    return country;
  }
}

module.exports = Currency;
