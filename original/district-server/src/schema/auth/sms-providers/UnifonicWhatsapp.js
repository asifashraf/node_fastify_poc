const { OTPProviders, smsSendStatus } = require('../enums');
const SMSProvider = require('./index');
const parsePhoneNumber = require('libphonenumber-js');
const axios = require('axios');
const { otp, smsAlertSlackUrl } = require('../../../../config');
const { SMSProviderError } = require('../errors');
const knex = require('../../../../database');
const SlackWebHookManager = require('../../slack-webhook-manager/slack-webhook-manager');

class UnifonicWhatsappMSG extends SMSProvider {
  constructor(phoneNumber, country) {
    super(phoneNumber, OTPProviders.UNIFONIC_WHATSAPP);
    this.smsURL = otp.unifonicWhatsappSMSBaseURL;

    this.phoneNumber = parsePhoneNumber(phoneNumber);
    this._country = country;
    this.db = knex;
  }

  async sendSMS({ referenceId, body, operationType }) {
    const response = await axios.post(
      this.smsURL,
      {
        'recipient': {
          'contact': this.phoneNumber.number,
          'channel': 'whatsapp',
        },
        'content': {
          'type': 'text',
          'text': body,
        },
      },
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'PublicId': `${otp.unifonicWhatsappPublicId}`,
          'Secret': `${otp.unifonicWhatsappSecret}`,
        },
      },
    );
    if (response.status !== 200) {
      this.logResponse({
        providerType: OTPProviders.UNIFONIC_WHATSAPP,
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
          otpProvider: OTPProviders.UNIFONIC_WHATSAPP,
          error: JSON.stringify(response.data)
        },
        webhookUrl: smsAlertSlackUrl,
      });
      throw new SMSProviderError(JSON.stringify(response.data));
    }
    await this.logResponse({
      providerType: OTPProviders.UNIFONIC_WHATSAPP,
      status: smsSendStatus.SENT,
      operationType,
      referenceId,
      message: body,
    });
    return response.data;
  }

  async sendDeliverySMS({ referenceId, body, operationType }) {

    const payload = {
      recipient: {
        contact: this.phoneNumber.number,
        channel: 'whatsapp'
      },
      content: {
        type: 'template',
        namespace: "{{whatsappTemplateNamespace}}",
        name: "rating_single_product_en",
        language: { code: "en" },
        components: [
          {
            type: "header",
            parameters: [
              {
                type: "file",
                url: "{{urlFilePdf}}"
              }
            ]
          },
          {
            type: "body",
            parameters: [
              {
                type: "text",
                text: "order-no-123"
              },
              {
                type: "datetime",
                datetime: {
                  value: "2020-04-10T08:54:09+00:00",
                  text: "May 1st, 2019 8:45pm"
                }
              },
              {
                type: "currency",
                currency: {
                  code: "USD",
                  value: 10990.23,
                  text: "$10990.23"
                }
              }
            ]
          }
        ]
      }
    };
    // Send whatsapp template message
    const response = await axios.post(this.smsURL, payload);
    if (response.status !== 200) {
      this.logResponse({
        providerType: OTPProviders.UNIFONIC_WHATSAPP,
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
          otpProvider: OTPProviders.UNIFONIC_WHATSAPP,
          error: JSON.stringify(response.data)
        },
        webhookUrl: smsAlertSlackUrl,
      });
      throw new SMSProviderError(JSON.stringify(response.data));
    }
    await this.logResponse({
      providerType: OTPProviders.UNIFONIC_WHATSAPP,
      status: smsSendStatus.SENT,
      operationType,
      referenceId,
      message: body,
    });
    return response.data;
  }
}

module.exports = UnifonicWhatsappMSG;
