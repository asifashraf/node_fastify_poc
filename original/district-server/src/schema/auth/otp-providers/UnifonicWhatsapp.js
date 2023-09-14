const { OTPProviders } = require('../enums');
const OTPProvider = require('./index');
const axios = require('axios');
const { otp, smsAlertSlackUrl } = require('../../../../config');
const { OTPProviderError } = require('../errors');
const SlackWebHookManager = require(
  '../../slack-webhook-manager/slack-webhook-manager'
);

class UnifonicWhatsapp extends OTPProvider {
  constructor(phoneNumber) {
    super(phoneNumber, OTPProviders.UNIFONIC_WHATSAPP);
    this.smsURL = otp.unifonicWhatsappSMSBaseURL;

    this.templateName = otp.unifonicWhatsappTemplateName;
  }

  async sendSMSOTP(OTPCode) {
    const response = await axios.post(
      this.smsURL,
      {
        'recipient': {
          'contact': this.phoneNumber.number,
          'channel': 'whatsapp',
        },
        'content': {
          'type': 'template',
          'name': this.templateName,
          'language': {
            'code': 'en',
          },
          'components': [
            {
              'type': 'body',
              'parameters': [
                {
                  'type': 'text',
                  'text': OTPCode.toString(),
                },
              ],
            },
            {
              'type': 'options',
              'parameters': [
                {
                  'value': OTPCode.toString(),
                  'subType': 'url',
                  'index': 0,
                },
              ],
            },
          ],
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
      this.logError(response.data);
      SlackWebHookManager.sendTextToSlack(`[!!! Error !!!]
SMS cannot send to ${this.phoneNumber.number} by ${OTPProviders.UNIFONIC_WHATSAPP}
Error : ${JSON.stringify(response.data)}`, smsAlertSlackUrl)
        .catch(err => console.error(err));
      throw new OTPProviderError(JSON.stringify(response.data));
    }
    return response.data;
  }
}

module.exports = UnifonicWhatsapp;
