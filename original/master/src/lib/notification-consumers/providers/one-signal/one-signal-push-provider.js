const axios = require('axios');
const { oneSignalConfig } = require('../../../../../config');

module.exports = {
  sendPushNotificationOneSignal: async function sendPushNotificationOneSignal(data) {
    let isSent = false;
    try {
      let response = await axios.post(`${oneSignalConfig.baseUrl}/api/v1/notifications`, data, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${oneSignalConfig.basicKey}`,
          charset: 'utf-8',
        },
      });
      console.info(`sendPushNotificationOneSignal > response >`, response);
      isSent = true;
    } catch (err) {
      //const errors = get(err, 'response.data.errors', undefined);
      isSent = false;
      console.error(`sendPushNotificationOneSignal > exception >`, { data: err.data, err });
    }
    console.info(`sendPushNotificationOneSignal > isSent >`, isSent);
    return isSent;
  }
}
