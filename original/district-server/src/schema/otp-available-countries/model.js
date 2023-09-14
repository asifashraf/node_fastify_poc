const BaseModel = require('../../base-model');
const { addLocalizationField } = require('../../lib/util');
const { redisTimeParameter } = require('../../../config');
const { sortBy } = require('lodash');
class OtpAvailableCountries extends BaseModel {
  constructor(db, context) {
    super(db, 'otp_available_countries', context);
  }

  async getAll(filters) {
    const query = super.getAll();
    const res = await this.context.sqlCache(query, redisTimeParameter.oneHourInSeconds);
    const sortedRes = sortBy(res, 'name');
    return addLocalizationField(sortedRes, 'name');
  }

  async getByIsoCode(isoCode) {
    isoCode = isoCode.toUpperCase();
    return this.db(this.tableName).where('iso_code', isoCode).first();
  }
}

module.exports = OtpAvailableCountries;
