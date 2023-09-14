const { SMSProviderValidationError, SMSServiceValidationError } = require('../errors');
const { smsRequestError } = require('../../auth/enums');
const knex = require('../../../../database');
const { uuid } = require('../../../lib/util');

class SMSProvider {
  constructor(phoneNumber) {
    // phoneNumber is parsed phone number by libphonenumber-js
    this.phoneNumber = phoneNumber;
    this._country = null;
    this.db = knex;
  }
  async validate() {
    // google validation
    if (!this.phoneNumber.isValid()) {
      throw new SMSServiceValidationError(smsRequestError.INVALID_PHONE_NUMBER);
    }
    // otp_available_countries check with dial code
    const country = await this.getCountry();
    if (!country) {
      throw new SMSServiceValidationError(
        smsRequestError.COUNTRY_IS_NOT_AVAILABLE,
      );
    }
    return true;
  }

  async sendSMS() {
    throw new SMSProviderValidationError(smsRequestError.INVALID_SMS_PROVIDER);
  }

  async logResponse({ providerType, status, operationType, referenceId, message }) {
    await this.db('sms_logs').insert({
      id: uuid.get(),
      provider_type: providerType,
      status,
      phone_number: this.phoneNumber.number,
      phone_country: this._country.isoCode,
      operation_type: operationType,
      reference_id: referenceId,
      message
    });
  }

  async getCountry() {
    if (!this._country) {
      this._country = await this.db('otp_available_countries')
        .where('iso_code', this.phoneNumber.country)
        .andWhere('is_sms_enabled', true)
        .first();
    }
    return this._country;
  }
}

module.exports = SMSProvider;
