/* eslint-disable camelcase */
const casual = require('casual');

module.exports = notifications => {
  let ix = 0;
  return [
    {
      id: casual.uuid,
      short_code: 'abc123',
      message: 'You will get 10% off by clicking this notification!',
      title: '10% Off',
      target_all: true,
      target_ios: false,
      target_android: false,
      notification_id: notifications[ix++].id,
    },
    {
      id: casual.uuid,
      short_code: 'efg098',
      message: 'You will get 15% off by clicking this notification!',
      title: '15% Off',
      target_all: false,
      target_ios: true,
      target_android: false,
      notification_id: notifications[ix++].id,
    },
    {
      id: casual.uuid,
      short_code: 'xyz456',
      message: 'You will get 20% off by clicking this notification!',
      title: '20% Off',
      target_all: false,
      target_ios: false,
      target_android: true,
      notification_id: notifications[ix++].id,
    },
  ];
};
