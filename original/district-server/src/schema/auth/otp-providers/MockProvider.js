const { OTPProviders } = require('../enums');
const OTPProvider = require('./index');
const { otp } = require('../../../../config');
const { OTPProviderError } = require('../errors');

class MockProvider extends OTPProvider {
  constructor(phoneNumber) {
    super(phoneNumber, OTPProviders.MOCK);
  }

  async sendSMSOTP(OTPCode) {
    if (otp.simulateErrorInMock) {
      const message = `otp provider error simulated for ${this.phoneNumber.number}`;
      this.logError(message);
      throw new OTPProviderError(message);
    }
    return {
      phoneNumber: this.phoneNumber.number,
      otpCode: OTPCode
    };
  }
}

module.exports = MockProvider;
