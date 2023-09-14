const { OTPProviderValidationError } = require('../errors');
const { otpRequestError } = require('../../root/enums');

class OTPProvider {
  constructor(phoneNumber, name) {
    // phoneNumber is parsed phone number by libphonenumber-js
    this.phoneNumber = phoneNumber;
    this.name = name;
  }
  async validate() {}

  async sendSMSOTP(OTPCode) {
    throw new OTPProviderValidationError(otpRequestError.INVALID_OTP_PROVIDER);
  }

  async sendVoiceOTP(OTPCode) {
    throw new OTPProviderValidationError(otpRequestError.INVALID_OTP_PROVIDER);
  }

  logError(err) {
    console.log(err);
  }
}

module.exports = OTPProvider;
