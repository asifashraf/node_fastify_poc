const { SES, config } = require('aws-sdk');
const { awsRemoteConfig } = require('../../../../../config');
const appConfig = require('../../../../../config');
const {
  updateNotificationStatusDb,
} = require('../../helpers/notification-status-helper');
const {
  EmailActions,
  NotificationStatus,
  NotificationInfoTableName,
} = require('../../definitions');

module.exports = {
  sendEmailNotification: async function sendEmailNotification(queryContext, emailMessage) {
    const preparedEmail = prepareEmailContentForSending(emailMessage);

    const isSent = await handleEmailSendOff(preparedEmail);

    await updateNotificationStatus(queryContext, emailMessage, isSent);
  }
}

function prepareEmailContentForSending(emailMessage) {
  const emailContent = emailMessage.content;
  console.info(`prepareEmailContentForSending > emailContent >`, emailContent);
  switch (emailMessage.action) {
    case EmailActions.PARTNER_REQUEST: {
      var countryRepresenter = '';
      if (emailContent.countryIso === undefined) {
        countryRepresenter = appConfig.notifications.supportEmails.DEFAULT;
      } else {
        countryRepresenter = appConfig.notifications.supportEmails[emailContent.countryIso]
          ? appConfig.notifications.supportEmails[emailContent.countryIso]
          : appConfig.notifications.supportEmails.DEFAULT;
      }
      return {
        Source: appConfig.notifications.doNotReply,
        Destination: {
          ToAddresses: [countryRepresenter],
        },
        Message: {
          Subject: {
            Data: emailContent.subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: emailContent.html,
              Charset: 'UTF-8',
            },
            Text: {
              Data: emailContent.text,
              Charset: 'UTF-8',
            },
          },
        },
      };
    }
    case EmailActions.CONTACT_US: {
      return {
        Source: appConfig.notifications.doNotReply,
        Destination: {
          ToAddresses: [appConfig.notifications.supportEmails.DEFAULT],
        },
        Message: {
          Subject: {
            Data: emailContent.subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: emailContent.html,
              Charset: 'UTF-8',
            },
            Text: {
              Data: emailContent.text,
              Charset: 'UTF-8',
            },
          },
        },
      };
    }
    case EmailActions.ACCOUNT_DELETION_REQUEST: {
      console.log(appConfig.notifications.financeTeamEmails);
      return {
        Source: appConfig.notifications.doNotReply,
        Destination: {
          ToAddresses: appConfig.notifications.financeTeamEmails,
        },
        Message: {
          Subject: {
            Data: emailContent.subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: emailContent.html,
              Charset: 'UTF-8',
            },
            Text: {
              Data: emailContent.text,
              Charset: 'UTF-8',
            },
          },
        },
      };
    }
    case EmailActions.CUSTOMER_EMAIL_VERIFICATION: {
      return {
        Source: appConfig.notifications.doNotReply,
        Destination: {
          ToAddresses: [emailContent.receiverEmail],
        },
        Message: {
          Subject: {
            Data: emailContent.subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: emailContent.html,
              Charset: 'UTF-8',
            },
            Text: {
              Data: emailContent.text,
              Charset: 'UTF-8',
            },
          },
        },
      };
    }
    default: {
      // For normal emails, just update notifications table
      return {
        Source: emailContent.sender,
        Destination: {
          ToAddresses: [emailContent.receiverEmail],
        },
        Message: {
          Subject: {
            Data: emailContent.subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: emailContent.html,
              Charset: 'UTF-8',
            },
            Text: {
              Data: emailContent.text,
              Charset: 'UTF-8',
            },
          },
        },
      };
    }
  }
}

async function handleEmailSendOff(preparedEmail) {
  config.update(awsRemoteConfig);

  const sesClient = new SES({ apiVersion: '2010-12-01' });

  let isSent = false;

  try {
    let response = await sesClient.sendEmail(preparedEmail).promise();
    console.info(`handleEmailSendOff > response >`, response);
    isSent = true;
  } catch (err) {
    isSent = false;
    console.error(`handleEmailSendOff > exception >`, { err });
  }
  console.info(`handleEmailSendOff > isSent >`, isSent);
  return isSent;
}

async function updateNotificationStatus(queryContext, emailMessage, isSent) {
  const updatedStatus = isSent
    ? NotificationStatus.DELIVERED
    : NotificationStatus.FAILED;
  switch (emailMessage.action) {
    case EmailActions.ACCOUNT_DELETION_REQUEST: {
      // there is no email table for account deletion requests
      break;
    }
    case EmailActions.PARTNER_REQUEST: {
      await updateNotificationStatusDb(
        queryContext,
        NotificationInfoTableName.PARTNER_REQUEST,
        emailMessage.content.id,
        updatedStatus
      );
      break;
    }
    case EmailActions.CONTACT_US: {
      await updateNotificationStatusDb(
        queryContext,
        NotificationInfoTableName.CONTACT_US,
        emailMessage.content.id,
        updatedStatus
      );
      break;
    }
    default: {
      // For normal emails, just update notifications table
      if (emailMessage.content.id) {
        await updateNotificationStatusDb(
          queryContext,
          NotificationInfoTableName.NOTIFICATIONS,
          emailMessage.content.id,
          updatedStatus
        );
      }
      break;
    }
  }
}
