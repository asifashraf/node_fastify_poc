const { toUpper, first } = require('lodash');

const { transformToCamelCase } = require('../../lib/util');
const BaseModel = require('../../base-model');
const { customerDeviceMetadataError } = require('../root/enums');

class CustomerDeviceMetadata extends BaseModel {
  constructor(db, context) {
    super(db, 'customer_device_metadata', context);
  }

  async getMetadataByDeviceId(deviceId) {
    return this.db(this.tableName)
      .where('device_id', deviceId)
      .then(transformToCamelCase)
      .then(first);
  }

  async getDeviceMetadataByCustomerIdAndDeviceId(customerId, deviceId) {
    return this.db(this.tableName)
      .where('customer_id', customerId)
      .andWhere('device_id', deviceId)
      .then(transformToCamelCase)
      .then(first);
  }

  async getDeviceMetadataByIdentifierTypeAndDeviceId(
    deviceIdentifierType,
    deviceId
  ) {
    return this.db(this.tableName)
      .where('device_identifier_type', deviceIdentifierType)
      .andWhere('device_id', deviceId)
      .then(transformToCamelCase)
      .then(first);
  }

  async setDefault(deviceId, customerId, isDefault) {
    if (isDefault) {
      // make all tokens isDefault=false only if we want to mark another card token as default
      await this.db(this.tableName)
        .where('customer_id', customerId)
        .update('is_default', false);
    }
    return this.db(this.tableName)
      .where('customer_id', customerId)
      .andWhere('device_id', deviceId)
      .update('is_default', isDefault);
  }

  getByCustomer(customerId) {
    return this.getAll().where('customer_id', customerId);
  }

  getDefaultByCustomer(customerId) {
    return this.getByCustomer(customerId)
      .andWhere('is_default', true)
      .then(transformToCamelCase)
      .then(first);
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
    // if device is registered to a user, no need to save it again
    if (existingDeviceMetadata) {
      return existingDeviceMetadata.id;
    }
    // else save as usual
    const [{ count }] = await this.getByCustomer(customerId).count();
    const deviceCount = Number(count);

    if (deviceCount === 0 || customerDeviceMetadata.isDefault) {
      return super.save({
        ...customerDeviceMetadata,
        isDefault: true,
      });
    }

    return super.save(customerDeviceMetadata);
  }
}

module.exports = CustomerDeviceMetadata;
