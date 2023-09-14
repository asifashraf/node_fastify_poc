const { google } = require('googleapis');
const axios = require('axios');
const { firebaseConfig } = require('../../../../../config');

const tokenTableName = "fcm_tokens";

function getAccessToken() {
  return new Promise((resolve, reject) => {
    const jwtClient = new google.auth.JWT(
      firebaseConfig.clientEmail,
      undefined,
      firebaseConfig.privateKey,
      firebaseConfig.messagingScope,
      undefined
    );
    jwtClient.authorize(function (err, tokens) {
      if (err) {
        console.error(`getAccessToken > error >`, err);
        reject(err);
        return;
      }
      resolve(tokens ? tokens.access_token : null);
    });
  });
}

module.exports = {
  sendPushNotificationFirebase: async function sendPushNotificationFirebase(queryContext, data) {
    let isSent = false;
    const accessToken = await getAccessToken();
    try {
      const responses = await Promise.all(
        data.messages.map((message) => {
          return axios
            .post(`${firebaseConfig.baseUrl}${firebaseConfig.notificationsEndpoint}`, message, {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            })
            .then(() => true)
            .catch((err) => {
              if (err.response && err.response.status === 404) {
                removeInvalidTokenFromDatabase(
                  queryContext,
                  JSON.parse(err.config.data).message.token
                );
              }
              console.error(`sendPushNotificationFirebase >`, err);
              return false;
            });
        })
      );
      isSent = responses.some((response) => response);
    } catch (err) {
      isSent = false;
      console.error(`sendPushNotificationFirebase > exception >`, { data: err.data, err });
    }
    console.info(`sendPushNotificationFirebase > isSent >`, isSent);
    return isSent;
  }
}

function removeInvalidTokenFromDatabase(queryContext, token) {
  queryContext.db
    .table(tokenTableName)
    .delete()
    .where('token', token)
    .catch((err) => console.error(`removeInvalidTokenFromDatabase > error >`, err));
}
