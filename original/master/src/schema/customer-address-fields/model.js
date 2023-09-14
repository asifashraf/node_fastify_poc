const BaseModel = require('../../base-model');
const {
  addLocalizationField,
  removeLocalizationField,
} = require('../../lib/util');
const { first } = require('lodash');
const { uuid } = require('../../lib/util');
const { createLoaders } = require('./loaders');
const { redisTimeParameter } = require('../../../config');
const {
  getCachedAddressFields,
  saveCachedAddressFields,
  invalidateAddressFieldsCache,
  calculateAddressFieldsKey,
} = require('./redis-helper');

class AddressField extends BaseModel {
  constructor(db, context) {
    super(db, 'customer_addresses_fields', context);
    this.loaders = createLoaders(this);
  }

  async getAll() {
    const query = this.db(this.tableName)
      .join('countries', `${this.tableName}.country_id`, 'countries.id')
      .select(this.tableName + '.*', 'countries.iso_code')
      .orderBy('order', 'asc');
    return addLocalizationField(await query, 'title');
  }

  async getAllByCountryCode(countryCode) {
    const query = this.db(this.tableName)
      .join('countries', `${this.tableName}.country_id`, 'countries.id')
      .select(this.tableName + '.*')
      .where('iso_code', countryCode)
      .orderBy('order', 'asc');
    return addLocalizationField(
      await this.context.sqlCache(query, redisTimeParameter.oneHourInSeconds),
      'title'
    );
  }

  async save(input) {
    const countryId = (await this.db
      .table('countries')
      .where('iso_code', input.countryCode)
      .then(first)).id;

    await this.db
      .table(this.tableName)
      .whereIn(
        'id',
        input.fields
          .filter(field => field.id && field.deleted)
          .map(field => field.id)
      )
      .delete();

    const insertedRaws = removeLocalizationField(
      input.fields
        .filter(field => !field.id && !field.deleted)
        .map(field => {
          return { ...field, countryId, id: uuid.get() };
        }),
      'title'
    );

    if (insertedRaws.length > 0) {
      await this.db(this.tableName).insert(insertedRaws);
    }

    const jobs = [];
    const that = this;
    input.fields
      .filter(field => field.id && !field.deleted)
      .map(field => {
        return { ...field, countryId };
      })
      .forEach(field => {
        jobs.push(
          that
            .db(that.tableName)
            .where('id', field.id)
            .update(removeLocalizationField(field, 'title'))
        );
      });

    await Promise.all(jobs);
    await invalidateAddressFieldsCache();
  }

  async getAddressFields() {
    const cacheKey = calculateAddressFieldsKey();
    let addressFields = await getCachedAddressFields(cacheKey);
    if (!addressFields) {
      const flatList = await this.roDb(this.tableName).orderBy('order', 'asc');
      const results = flatList.reduce(function (results, item) {
        (results[item.countryId] = results[item.countryId] || []).push(item);
        return results;
      }, {});
      const list = [];
      Object.keys(results).forEach(key => {
        const newItem = {
          countryId: key,
          addressFields: addLocalizationField(results[key], 'title'),
        };
        list.push(newItem);
      });
      addressFields = list;
      await saveCachedAddressFields(cacheKey, addressFields);
    }
    return addressFields;
  }
}

module.exports = AddressField;
