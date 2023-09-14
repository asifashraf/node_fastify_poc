const { first } = require('lodash');

const BaseModel = require('../../base-model');
const { configurationSaveError } = require('../root/enums');

class Configuration extends BaseModel {
  constructor(db, context) {
    super(db, 'configuration', context);
  }

  getCurrent() {
    return this.context.sqlCache(this.roDb(this.tableName)).then(first);
  }

  save(configuration) {
    return this.db(this.tableName)
      .update(configuration)
      .then(() => this.getCurrent());
  }

  validate(configuration) {
    const errors = [];

    if (configuration.deliveryWindowMin > configuration.deliveryWindowMax) {
      errors.push(configurationSaveError.INVALID_DELIVERY_WINDOW);
    }

    return errors;
  }

  async getDefaultCountry(currentConfiguration) {
    return {
      id: currentConfiguration.defaultCountryId || '',
      latitude: currentConfiguration.defaultLatitude,
      longitude: currentConfiguration.defaultLongitude,
    };
  }
}

module.exports = Configuration;
