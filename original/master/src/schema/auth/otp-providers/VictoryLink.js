const { OTPProviders } = require('../enums');
const OTPProvider = require('./index');
const axios = require('axios');
const { otp, smsAlertSlackUrl } = require('../../../../config');
const { OTPProviderError } = require('../errors');
const { buildAbsoluteUrl, uuid } = require('../../../lib/util');
const SlackWebHookManager = require(
  '../../slack-webhook-manager/slack-webhook-manager'
);

class VictoryLink extends OTPProvider {
  constructor(phoneNumber) {
    super(phoneNumber, OTPProviders.VICTORY_LINK);
    this.smsURL = otp.victoryLinkSMSBaseURL;
    this.senderId = otp.victoryLinkSMSSenderId || otp.senderID;
  }

  async sendSMSOTP(OTPCode) {
    const body = {
      'UserName': otp.victoryLinkUsername,
      'Password': otp.victoryLinkPassword,
      'SMSText': `OTP Code for CofeApp is ${OTPCode}`,
      'SMSLang': 'E',
      'SMSSender': this.senderId,
      // this provider work with only Egypt numbers
      // that's why we used nationalNumber without country code
      'SMSReceiver': this.phoneNumber.nationalNumber,
      'SMSID': uuid.get(),
      'DLRURL': buildAbsoluteUrl(
        `/otp-callbacks/sms-delivery-report/${OTPProviders.VICTORY_LINK}`
      ),
    };
    const response = await axios.post(this.smsURL, body, {
      headers: {
        'content-type': 'application/json',
      },
    });
    if (response.status !== 200 || response.data !== 0) {
      this.logError(response.data);
      SlackWebHookManager.sendTextToSlack(`[!!! Error !!!]
SMS cannot send to ${this.phoneNumber.number} by ${OTPProviders.VICTORY_LINK}
Error : ${JSON.stringify(response.data)}`, smsAlertSlackUrl)
        .catch(err => console.error(err));
      throw new OTPProviderError(JSON.stringify(response.data));
    }
    return {
      ...body,
      'UserName': '',
      'Password': '',
      responseCode: response.data
    };
  }
}

module.exports = VictoryLink;
