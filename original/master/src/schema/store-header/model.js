const { map } = require('lodash');

const BaseModel = require('../../base-model');
const {
  uITargetActionType,
  storeHeaderSaveError,
  statusTypes,
} = require('../root/enums');
const { addLocalizationField } = require('../../lib/util');

class StoreHeader extends BaseModel {
  constructor(db, context) {
    super(db, 'store_headers', context);
  }

  filterStoreHeaders(query, filters = {}) {
    if (Object.keys(filters).length === 0) {
      return query;
    }

    if (typeof filters.status === 'undefined') {
      filters.status = statusTypes.ACTIVE;
    }
    if (filters.status !== 'ALL') {
      query.where(`${this.tableName}.status`, filters.status);
    }

    if (filters.countryId) {
      query.where('country_id', filters.countryId);
    }
    return query;
  }

  getAll(filters) {
    let query = super.getAll().select(this.db.raw(`${this.tableName}.*`));
    if (filters) {
      query = this.filterStoreHeaders(query, filters);
    }
    return query;
  }

  async getAllForMobile(countryCode) {
    const query = this.getAll({ status: statusTypes.ACTIVE })
      .join('countries', 'countries.id', `${this.tableName}.country_id`)
      .whereRaw(
        'LOWER("countries"."iso_code") = ?',
        countryCode.toString().toLowerCase()
      )
      .andWhereRaw(
        `now() between "${this.tableName}"."available_from" and "${this.tableName}"."available_until"`
      );

    return addLocalizationField(
      map(await query, header => {
        const target = {
          action: uITargetActionType.DEEP_LINK,
          params: [
            {
              id: uITargetActionType.DEEP_LINK,
              value: [header.action],
            },
          ],
          __typeOf: 'UITargetAction',
        };
        return { ...header, target };
      }),
      'image'
    );
  }

  async getById(id, localized = false) {
    const item = await super.getById(id);
    if (!localized) {
      return item;
    }
    return addLocalizationField(item, 'image');
  }

  async sortStoreHeaders(ids) {
    if (ids.length > 0) {
      const items = map(ids, (id, sortOrder) => ({ id, sortOrder }));
      await this.save(items);
    }
    return true;
  }

  async validate(input) {
    const errors = [];
    const country = await this.context.country.getById(input.countryId);
    if (!country) {
      errors.push(storeHeaderSaveError.INVALID_COUNTRY);
    }

    return errors;
  }

  async getAllForMobileNew(countryId) {
    const query = this.getAll({ status: statusTypes.ACTIVE })
      .where('country_id', countryId)
      .andWhereRaw(
        `now() between "${this.tableName}"."available_from" and "${this.tableName}"."available_until"`
      );

    return addLocalizationField(
      map(await query, header => {
        const target = {
          action: uITargetActionType.DEEP_LINK,
          params: [
            {
              id: uITargetActionType.DEEP_LINK,
              value: [header.action],
            },
          ],
          __typeOf: 'UITargetAction',
        };
        return { ...header, target };
      }),
      'image'
    );
  }
}

module.exports = StoreHeader;
