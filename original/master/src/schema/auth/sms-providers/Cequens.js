const { OTPProviders, smsSendStatus } = require('../enums');
const SMSProvider = require('./index');
const parsePhoneNumber = require('libphonenumber-js');
const axios = require('axios');
const { otp, smsAlertSlackUrl } = require('../../../../config');
const { SMSProviderError } = require('../errors');
const knex = require('../../../../database');
const SlackWebHookManager = require('../../slack-webhook-manager/slack-webhook-manager');
const { buildAbsoluteUrl } = require('../../../lib/util');

class CequensSMS extends SMSProvider {
  constructor(phoneNumber, country) {
    super(phoneNumber, OTPProviders.CEQUENS);
    this.smsURL = otp.cequensSMSBaseURL;
    this.senderId = otp.cequensSMSSenderId || otp.senderID;
    this.phoneNumber = parsePhoneNumber(phoneNumber);
    this._country = country;
    this.db = knex;
  }

  async sendSMS({ referenceId, body, operationType }) {
    const response = await axios.post(
      this.smsURL,
      {
        senderName: this.senderId,
        messageType: 'text',
        messageText: body,
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
      this.logResponse({
        providerType: OTPProviders.CEQUENS,
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
          otpProvider: OTPProviders.CEQUENS,
          error: JSON.stringify(response.data)
        },
        webhookUrl: smsAlertSlackUrl,
      });
      throw new SMSProviderError(JSON.stringify(response.data));
    }
    await this.logResponse({
      providerType: OTPProviders.CEQUENS,
      status: smsSendStatus.SENT,
      operationType,
      referenceId,
      message: body,
    });
    return response.data;
  }
}

module.exports = CequensSMS;
