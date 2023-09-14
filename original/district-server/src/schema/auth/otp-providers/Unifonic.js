const { OTPProviders } = require('../enums');
const OTPProvider = require('./index');
const axios = require('axios');
const { otp, smsAlertSlackUrl } = require('../../../../config');
const { OTPProviderError } = require('../errors');
const { uuid } = require('../../../lib/util');
const SlackWebHookManager = require('../../slack-webhook-manager/slack-webhook-manager');

class Unifonic extends OTPProvider {
  constructor(phoneNumber) {
    super(phoneNumber, OTPProviders.UNIFONIC);
    this.smsURL = otp.unifonicSMSBaseURL;
    this.senderId = otp.unifonicSMSSenderId || otp.senderID;
  }

  async sendSMSOTP(OTPCode) {
    const response = await axios.post(
      this.smsURL,
      null,
      {
        headers: {
          'Accept': 'application/json',
        },
        params: {
          AppSid: otp.unifonicAppSid,
          SenderID: this.senderId,
          Body: `OTP Code for CofeApp is ${OTPCode}`,
          Recipient: this.phoneNumber.number,
          responseType: 'JSON',
          CorrelationID: uuid.get(),
          baseEncode: true,
          statusCallback: 'sent',
          async: false,
        }
      },
    );
    if (response.status !== 200) {
      this.logError(response.data);
      SlackWebHookManager.sendTextToSlack(`[!!! Error !!!]
SMS cannot send to ${this.phoneNumber.number} by ${OTPProviders.UNIFONIC}
Error : ${JSON.stringify(response.data)}`, smsAlertSlackUrl);
      throw new OTPProviderError(JSON.stringify(response.data));
    }
    return response.data;
  }
}

module.exports = Unifonic;
