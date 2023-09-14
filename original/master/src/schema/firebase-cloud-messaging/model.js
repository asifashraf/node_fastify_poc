const BaseModel = require('../../base-model');
const { FCMTokenResponseStatus } = require('./enums');

class FirebaseCloudMessaging extends BaseModel {
  constructor(db, context) {
    super(db, 'fcm_tokens', context);
  }

  getCustomersTokens(customerIds) {
    return this.selectFields(['token']).whereIn('customerId', customerIds);
  }

  async save(params) {
    try {
      const { customerId, deviceId, token } = params;
      if (deviceId) {
        const customerTokens = await this.db(this.tableName).where(
          'customerId',
          customerId,
        ) || [];
        const currentDevice = customerTokens.find(
          fcmToken => (
            (deviceId && fcmToken.deviceId === deviceId) ||
            fcmToken.token === token
          ),
        );
        if (currentDevice) {
          params.id = currentDevice.id;
        }
      }
      await super.save(params);
      return { status: FCMTokenResponseStatus.SUCCESS, data: params };
    } catch (err) {
      return {
        status: FCMTokenResponseStatus.ERROR,
        message: JSON.stringify(err),
      };
    }
  }
}

module.exports = FirebaseCloudMessaging;
