const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');
const {
  notificationMedia,
  notificationProviders,
  notificationActions,
  notificationStatuses,
} = require('../../notifications/enums');

class ContactUs extends BaseModel {
  constructor(db, context) {
    super(db, 'contact_us', context);
    this.loaders = createLoaders(this);
  }
  async contact({ name, email, phoneNumber, subject, content, newsletter }) {
    const id = await this.save({
      name,
      email,
      phoneNumber,
      subject,
      content,
      newsletter,
      status: notificationStatuses.PENDING,
    });
    const contactUsContent = await this.generateContactUsNotificationContent(
      id,
      name,
      email,
      phoneNumber,
      subject,
      content
    );
    await this.context.notification.sendNotificationContentToQueue(
      notificationMedia.EMAIL,
      notificationProviders.AWS_SES,
      contactUsContent,
      notificationActions.CONTACT_US
    );
    return { success: true, message: 'Sent' };
  }

  async generateContactUsNotificationContent(
    id,
    name,
    email,
    phoneNumber,
    subject,
    content
  ) {
    const html = `
      Contacted by:
      <hr>
      <br /><br />
      Name: ${name} <br />
      Email: ${email} <br />
      Phone Number: ${phoneNumber} <br />
      Subject: ${subject} <br />
      Message: ${content} <br />
      `;
    const text = html;
    return {
      id,
      subject,
      html,
      text,
    };
  }
}

module.exports = ContactUs;
