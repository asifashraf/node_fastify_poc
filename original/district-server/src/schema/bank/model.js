const BaseModel = require('../../base-model');
const { defaultMaxLimit } = require('../../../config');
const { addPaging } = require('../../lib/util');
const { saveBankError } = require('../root/enums');

class Bank extends BaseModel {
  constructor(db, context) {
    super(db, 'banks', context);
  }

  async validate(bankInput) {
    const errors = [];
    if (bankInput.hasUniqueIdentifier) {
      if (!bankInput.identifier) {
        errors.push(saveBankError.MISSING_IDENTIFIER);
      } else if (
        bankInput.identifier.length !== 5
      ) {
        errors.push(saveBankError.INVALID_LENGTH_IDENTIFIER);
      } else {
        const banks = await this.db(this.tableName).where('identifier', bankInput.identifier);
        if (banks.length > 0 && (!bankInput.id || banks[0].id !== bankInput.id)) {
          errors.push(saveBankError.ALREADY_EXISTS_IDENTIFIER);
        }
      }
    }
    if (!bankInput.name) {
      errors.push(saveBankError.MISSING_NAME);
    }
    if (!bankInput.countryId) {
      errors.push(saveBankError.MISSING_COUNTRY_ID);
    }
    return errors;
  }

  async searchWithName(searchTerm, countryId, paging, status) {
    const query = this.db(this.tableName);

    query.andWhere('country_id', countryId);

    if (searchTerm) {
      query.andWhere(query => {
        query.orWhere('name', 'ILIKE', `%${searchTerm}%`);
      });
    }

    if (status) {
      query.andWhere('status', status);
    }

    return addPaging(query, paging, defaultMaxLimit);
  }

  async getAllByCountryId(countryId) {
    const query = this.db(this.tableName).where('iso_code', countryId);
    return this.context.sqlCache(query);
  }

  async getAllByCountryCode(countryCode) {
    const query = this.db(this.tableName)
      .join('countries', `${this.tableName}.country_id`, 'countries.id')
      .where('iso_code', countryCode);
    return this.context.sqlCache(query);
  }
}

module.exports = Bank;
