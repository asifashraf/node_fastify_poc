const { OTPProviders, smsSendStatus } = require('../enums');
const SMSProvider = require('./index');
const parsePhoneNumber = require('libphonenumber-js');
const axios = require('axios');
const { otp, smsAlertSlackUrl } = require('../../../../config');
const { SMSProviderError } = require('../errors');
const { uuid } = require('../../../lib/util');
const knex = require('../../../../database');
const SlackWebHookManager = require('../../slack-webhook-manager/slack-webhook-manager');

class UnifonicSMS extends SMSProvider {
  constructor(phoneNumber, country) {
    super(phoneNumber, OTPProviders.UNIFONIC);
    this.smsURL = otp.unifonicSMSBaseURL;
    this.phoneNumber = parsePhoneNumber(phoneNumber);
    this._country = country;
    this.db = knex;
  }


  async sendSMS({ referenceId, body, operationType }) {
    const response = await axios.post(
      this.smsURL,
      null,
      {
        headers: {
          'Accept': 'application/json',
        },
        params: {
          AppSid: otp.unifonicAppSid,
          SenderID: otp.unifonicSMSSenderId,
          Body: body,
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
      await this.logResponse({
        providerType: OTPProviders.UNIFONIC,
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
          otpProvider: OTPProviders.UNIFONIC,
          error: JSON.stringify(response.data)
        },
        webhookUrl: smsAlertSlackUrl,
      });
      throw new SMSProviderError(JSON.stringify(response.data));
    }
    await this.logResponse({
      providerType: OTPProviders.UNIFONIC,
      status: smsSendStatus.SENT,
      operationType,
      referenceId,
      message: body,
    });
    return response.data;
  }


}

module.exports = UnifonicSMS;
