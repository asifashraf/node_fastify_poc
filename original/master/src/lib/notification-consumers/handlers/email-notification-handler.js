const {
  sendEmailNotification,
} = require('../providers/ses/ses-email-provider');
const { NotificationProvider } = require('../definitions');

module.exports = {
  handleEmailNotification: async function handleEmailNotification(queryContext, message) {
    switch (message.provider) {
      case NotificationProvider.AWS_SES: {
        await sendEmailNotification(queryContext, message);
        break;
      }
      default: {
        throw new Error(
          'Unknown Email Notification Handler : ' + message.provider
        );
      }
    }
  }
}
