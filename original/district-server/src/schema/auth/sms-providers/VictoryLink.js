const { OTPProviders, smsSendStatus } = require('../enums');
const SMSProvider = require('./index');
const parsePhoneNumber = require('libphonenumber-js');
const axios = require('axios');
const { otp, smsAlertSlackUrl } = require('../../../../config');
const { SMSProviderError } = require('../errors');
const knex = require('../../../../database');
const SlackWebHookManager = require('../../slack-webhook-manager/slack-webhook-manager');
const { buildAbsoluteUrl, uuid } = require('../../../lib/util');

class VictoryLinkSMS extends SMSProvider {
  constructor(phoneNumber, country) {
    super(phoneNumber, OTPProviders.VICTORY_LINK);
    this.smsURL = otp.victoryLinkSMSBaseURL;
    this.senderId = otp.victoryLinkSMSSenderId || otp.senderID;
    this.phoneNumber = parsePhoneNumber(phoneNumber);
    this._country = country;
    this.db = knex;
  }

  async sendSMS({ referenceId, body, operationType }) {
    const response = await axios.post(
      this.smsURL,
      {
        'UserName': otp.victoryLinkUsername,
        'Password': otp.victoryLinkPassword,
        'SMSText': body,
        'SMSLang': 'E',
        'SMSSender': this.senderId,
        // this provider work with only Egypt numbers
        // that's why we used nationalNumber without country code
        'SMSReceiver': this.phoneNumber.nationalNumber,
        'SMSID': uuid.get(),
        'DLRURL': buildAbsoluteUrl(
          `/otp-callbacks/sms-delivery-report/${OTPProviders.VICTORY_LINK}`
        ),
      },
      {
        headers: {
          'content-type': 'application/json',
        },
      },
    );
    if (response.status !== 200 || response.data !== 0) {
      this.logResponse({
        providerType: OTPProviders.VICTORY_LINK,
        status: smsSendStatus.FAILED,
        operationType,
        referenceId,
        message: body,
      });
      SlackWebHookManager.sendTextAndObjectAndImage({
        text: '[!!!SMS_SERVICE_FAIL!!!]',
        object: {
          referenceId,
          body,
          operationType,
          driverPhone: this.phoneNumber.number,
          otpProvider: OTPProviders.VICTORY_LINK,
          error: JSON.stringify(response.data)
        },
        webhookUrl: smsAlertSlackUrl,
      });
      throw new SMSProviderError(JSON.stringify(response.data));
    }
    await this.logResponse({
      providerType: OTPProviders.VICTORY_LINK,
      status: smsSendStatus.SENT,
      operationType,
      referenceId,
      message: body,
    });
    return response.data;
  }
}

module.exports = VictoryLinkSMS;
