const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');
const {
  notificationMedia,
  notificationProviders,
  notificationActions,
  notificationStatuses,
} = require('../../notifications/enums');

class PartnerRequest extends BaseModel {
  constructor(db, context) {
    super(db, 'partner_requests', context);
    this.loaders = createLoaders(this);
  }
  async request({
    name,
    shopName,
    email,
    phoneNumber,
    country,
    countryISO,
    businessType,
    locationsCount,
    fulfillmentServices,
    menuUrl,
    instagramAccount,
    coffeeKeyFeature,
    termsConditions,
    gdprGuidelines,
  }) {
    const id = await this.save({
      name,
      shopName,
      email,
      phoneNumber,
      country,
      businessType,
      locationsCount,
      fulfillmentServices,
      menuUrl,
      instagramAccount,
      coffeeKeyFeature,
      termsConditions,
      gdprGuidelines,
      status: notificationStatuses.PENDING,
    });
    const content = await this.generatePartnerRequestNotificationContent(id);
    content.countryIso = countryISO;
    await this.context.notification.sendNotificationContentToQueue(
      notificationMedia.EMAIL,
      notificationProviders.AWS_SES,
      content,
      notificationActions.PARTNER_REQUEST
    );
    return { success: true, message: 'Sent' };
  }

  async generatePartnerRequestNotificationContent(partnerRequestId) {
    const {
      id,
      name,
      shopName,
      email,
      phoneNumber,
      country,
      businessType,
      locationsCount,
      fulfillmentServices,
      menuUrl,
      instagramAccount,
      coffeeKeyFeature,
      termsConditions,
      gdprGuidelines,
    } = await this.context.partnerRequest.getById(partnerRequestId);
    const html = `
        Contacted by:
        <hr>
        <br /><br />
        Name: ${name} <br />
        Shop name: ${shopName} <br />
        Email: ${email} <br />
        Phone Number: ${phoneNumber} <br />
        Country: ${country} <br />
        Business Type: ${businessType} <br />
        Number of Location: ${locationsCount} <br />
        Fulfillment Services: ${fulfillmentServices} <br />
        Menu URL: ${menuUrl} <br />
        Instagram: ${instagramAccount} <br />
        Coffee is Key Feature: ${coffeeKeyFeature} <br />
        Terms and Conditions: ${termsConditions} <br />
        GDPR Guidelines: ${gdprGuidelines} <br />
        `;

    const text = html;
    const subject = `${shopName || name} wants to become a partner with us!`;

    return {
      id,
      subject,
      html,
      text,
    };
  }
}

module.exports = PartnerRequest;
