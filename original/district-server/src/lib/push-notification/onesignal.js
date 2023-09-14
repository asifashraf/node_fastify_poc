const { oneSignalConfig } = require('../../../config');

async function generateOneSignalPushNotificationPayload(data) {
  // default channel would be push
  data.channel = data.channel || 'push';
  // set default content
  data.channel = data.channel || 'push';
  data.contents = data.contents || {};
  data.headings = data.headings || {};
  data.url = data.url || null;
  return {
    id: data.id,
    /* eslint-disable camelcase */
    app_id: oneSignalConfig.appId,
    contents: data.contents,
    headings: data.headings,
    // url: data.url,
    // app_url: data.url,
    data: {
      applinks: data.url,
    },
    /* eslint-disable camelcase */
    include_external_user_ids: data.customerIds,
    /* eslint-disable camelcase */
    channel_for_external_user_ids: data.channel,
  };
}

module.exports = {
  generateOneSignalPushNotificationPayload
};
