const { toUpper } = require('lodash');
const BaseModel = require('../../base-model');
const { customerDeviceMetadataError } = require('../root/enums');
const moment = require('moment/moment');

class CustomerDeviceMetadata extends BaseModel {
  constructor(db, context) {
    super(db, 'customer_device_metadata', context);
  }

  async getDeviceMetadataByCustomerIdAndDeviceId(customerId, deviceId) {
    return this.db(this.tableName)
      .where('customer_id', customerId)
      .andWhere('device_id', deviceId)
      .orderBy('updated', 'desc')
      .first();
  }

  getByCustomer(customerId) {
    return this.getAll().orderBy('updated', 'desc').where('customer_id', customerId);
  }

  getDefaultByCustomer(customerId) {
    return this.getByCustomer(customerId).first();
  }

  validate(deviceMetadata) {
    const errors = [];
    if (!deviceMetadata.customerId) {
      errors.push(customerDeviceMetadataError.MISSING_CUSTOMER_ID);
    }
    if (!deviceMetadata.deviceIdentifierType) {
      errors.push(customerDeviceMetadataError.MISSING_DEVICE_IDENTIFIER_TYPE);
    }
    if (!deviceMetadata.deviceId) {
      errors.push(customerDeviceMetadataError.MISSING_DEVICE_ID);
    }
    return errors;
  }

  async save(customerDeviceMetadata) {
    const {
      customerId,
      deviceId,
      deviceIdentifierType,
    } = customerDeviceMetadata;
    customerDeviceMetadata.deviceIdentifierType = toUpper(deviceIdentifierType);
    const existingDeviceMetadata = await this.getDeviceMetadataByCustomerIdAndDeviceId(
      customerId,
      deviceId
    );

    if (existingDeviceMetadata) {
      await super.save({
        id: existingDeviceMetadata.id,
        updated: moment().utc().toISOString(),
      });
      return existingDeviceMetadata.id;
    }

    return super.save(customerDeviceMetadata);
  }
}

module.exports = CustomerDeviceMetadata;
