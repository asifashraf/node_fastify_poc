const BaseModel = require('../../base-model');
const { defaultMaxLimit } = require('../../../config');
const { addPaging } = require('../../lib/util');
const { saveBankCardError } = require('../root/enums');

class BankCard extends BaseModel {
  constructor(db, context) {
    super(db, 'bank_cards', context);
  }

  validate(bankCardInput) {
    const errors = [];
    if (!bankCardInput.identifier) {
      errors.push(saveBankCardError.MISSING_IDENTIFIER);
    } else if (bankCardInput.identifier.length !== 6) {
      errors.push(saveBankCardError.INVALID_LENGTH_IDENTIFIER);
    }
    if (!bankCardInput.name) {
      errors.push(saveBankCardError.MISSING_NAME);
    }
    if (!bankCardInput.bankId) {
      errors.push(saveBankCardError.MISSING_BANK_ID);
    }
    return errors;
  }

  async getAllByBankId(bankId) {
    const query = this.db(this.tableName).where('bank_id', bankId);
    return this.context.sqlCache(query);
  }
  // update statuses of all bank cards issued by bank
  setBankCardStatusByBankId(bankId, status) {
    return this.db(this.tableName)
      .update('status', status)
      .where('bank_id', bankId);
  }
  async searchWithName(countryId, searchTerm, bankIds, paging) {
    const query = this.db('bank_cards as bcrd')
      .select('bcrd.*')
      .join('banks as bnk', 'bnk.id', 'bcrd.bank_id')
      .where('bnk.country_id', countryId);

    if (searchTerm) {
      query.andWhere(query => {
        query.orWhere('bcrd.name', 'ILIKE', `%${searchTerm}%`);
      });
    }

    if (bankIds) {
      query.andWhere(query => {
        bankIds.forEach(bankId => {
          query.orWhere('bcrd.bank_id', bankId);
        });
      });
    }

    return addPaging(query, paging, defaultMaxLimit);
  }
}

module.exports = BankCard;
