const { first } = require('lodash');

const BaseModel = require('../../base-model');
const {
  addLocalizationField,
  removeLocalizationField,
} = require('../../lib/util');
const { bannerSaveError } = require('../root/enums');
const { uuid } = require('../../lib/util');

class Banner extends BaseModel {
  constructor(db, context) {
    super(db, 'banners', context);
  }

  async getAllByCountryCode(countryCode, showInactive) {
    const query = this.db(this.tableName)
      .join('countries', `${this.tableName}.country_id`, 'countries.id')
      .where('iso_code', countryCode);
    if (!showInactive) query.where('active', true);
    query.orderBy('order', 'asc');
    return addLocalizationField(await this.context.sqlCache(query), 'imageUrl');
  }

  async getAllByCountryId(countryId, showInactive) {
    const query = this.db(this.tableName).where('country_id', countryId);
    if (!showInactive) query.where('active', true);
    query.orderBy('order', 'asc');
    return addLocalizationField(await this.context.sqlCache(query), 'imageUrl');
  }
  async getById(id) {
    return addLocalizationField(
      await this.db
        .table(this.tableName)
        .where('id', id)
        .then(first),
      'imageUrl'
    );
  }

  async validate(banner) {
    const errors = [];
    if (banner.id) {
      const existing = await this.getById(banner.id);
      if (!existing) {
        errors.push(bannerSaveError.INVALID_BANNER);
      }
    }
    return errors;
  }

  async save(input) {
    const validationErrors = await this.validate(input);
    if (validationErrors.length > 0) {
      return { error: validationErrors };
    }
    let bannerId = '';
    if (input.id) {
      bannerId = input.id;
      await this.db(this.tableName)
        .where('id', bannerId)
        .update(removeLocalizationField(input, 'imageUrl'));
    } else {
      bannerId = uuid.get();
      input.id = bannerId;
      await this.db(this.tableName).insert(
        removeLocalizationField(input, 'imageUrl')
      );
    }
    return { bannerId };
  }

  async delete(id) {
    const bannerDelete = Boolean(await this.getById(id));
    if (bannerDelete)
      await this.db
        .table(this.tableName)
        .where('id', id)
        .delete();
    return bannerDelete;
  }
}

module.exports = Banner;
