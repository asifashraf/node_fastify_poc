const { OTPProviders, smsSendStatus } = require('../enums');
const SMSProvider = require('./index');
const parsePhoneNumber = require('libphonenumber-js');
const axios = require('axios');
const { otp, smsAlertSlackUrl } = require('../../../../config');
const { SMSProviderError } = require('../errors');
const knex = require('../../../../database');
const SlackWebHookManager = require('../../slack-webhook-manager/slack-webhook-manager');

class KarixSMS extends SMSProvider {
  constructor(phoneNumber, country) {
    super(phoneNumber, OTPProviders.KARIX);
    this.smsURL = otp.karixSMSBaseURL;
    this.phoneNumber = parsePhoneNumber(phoneNumber);
    this._country = country;
    this.db = knex;
  }

  async sendSMS({ referenceId, body, operationType }) {
    const response = await axios.post(
      this.smsURL,
      {
        ver: '1.0',
        key: otp.karixKey,
        messages: [{
          send: otp.karixSMSSenderId,
          dest: [this.phoneNumber.number],
          text: body,
          type: 'UC',
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
      this.logResponse({
        providerType: OTPProviders.KARIX,
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
          otpProvider: OTPProviders.KARIX,
          error: JSON.stringify(response.data)
        },
        webhookUrl: smsAlertSlackUrl,
      });
      throw new SMSProviderError(JSON.stringify(response.data));
    }
    await this.logResponse({
      providerType: OTPProviders.KARIX,
      status: smsSendStatus.SENT,
      operationType,
      referenceId,
      message: body,
    });
    return response.data;
  }
}

module.exports = KarixSMS;
