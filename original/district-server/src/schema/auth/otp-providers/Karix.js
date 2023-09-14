const { OTPProviders } = require('../enums');
const OTPProvider = require('./index');
const { otp, smsAlertSlackUrl } = require('../../../../config');
const axios = require('axios');
const { OTPProviderError } = require('../errors');
const SlackWebHookManager = require('../../slack-webhook-manager/slack-webhook-manager');

class Karix extends OTPProvider {
  constructor(phoneNumber) {
    super(phoneNumber, OTPProviders.KARIX);
    this.smsURL = otp.karixSMSBaseURL;
    this.senderId = otp.karixSMSSenderId || otp.senderID;
  }

  async sendSMSOTP(OTPCode) {
    const response = await axios.post(
      this.smsURL,
      {
        ver: '1.0',
        key: otp.karixKey,
        messages: [{
          send: this.senderId,
          dest: [this.phoneNumber.number],
          text: `OTP Code for CofeApp is ${OTPCode}`,
          'dlr_req': 1,
        }],
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
    if (response.status !== 200) {
      this.logError(response.data);
      SlackWebHookManager.sendTextToSlack(`[!!! Error !!!]
SMS cannot send to ${this.phoneNumber.number} by ${OTPProviders.KARIX}
Error : ${JSON.stringify(response.data)}`, smsAlertSlackUrl);
      throw new OTPProviderError(JSON.stringify(response.data));
    }
    return response.data;
  }
}

module.exports = Karix;
