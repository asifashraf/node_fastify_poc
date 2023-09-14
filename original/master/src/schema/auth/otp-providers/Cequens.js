const { OTPProviders } = require('../enums');
const OTPProvider = require('./index');
const axios = require('axios');
const { otp, smsAlertSlackUrl } = require('../../../../config');
const { OTPProviderError } = require('../errors');
const { buildAbsoluteUrl } = require('../../../lib/util');
const SlackWebHookManager = require(
  '../../slack-webhook-manager/slack-webhook-manager'
);

class Cequens extends OTPProvider {
  constructor(phoneNumber) {
    super(phoneNumber, OTPProviders.CEQUENS);
    this.smsURL = otp.cequensSMSBaseURL;
    this.senderId = otp.cequensSMSSenderId || otp.senderID;
  }

  async sendSMSOTP(OTPCode) {
    const response = await axios.post(
      this.smsURL,
      {
        senderName: this.senderId,
        messageType: 'text',
        messageText: `OTP Code for CofeApp is ${OTPCode}`,
        recipients: this.phoneNumber.number,
        dlrUrl: buildAbsoluteUrl(
          `/otp-callbacks/sms-delivery-report/${OTPProviders.CEQUENS}`
        )
      },
      {
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'Authorization': `Bearer ${otp.cequensToken}`,
        },
      },
    );
    if (response.status !== 200) {
      this.logError(response.data);
      SlackWebHookManager.sendTextToSlack(`[!!! Error !!!]
SMS cannot send to ${this.phoneNumber.number} by ${OTPProviders.CEQUENS}
Error : ${JSON.stringify(response.data)}`, smsAlertSlackUrl)
        .catch(err => console.error(err));
      throw new OTPProviderError(JSON.stringify(response.data));
    }
    return response.data;
  }
}

module.exports = Cequens;
