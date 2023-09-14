/* eslint-disable camelcase */
const BaseModel = require('../../base-model');

class AuthCustomer extends BaseModel {
  constructor(db, context) {
    super(db, 'auth_customer', context);
  }

  updateDisableStatus(id, status) {
    return this.db(this.tableName)
      .update('is_disabled', Boolean(status))
      .where('id', id);
  }

  getAllByPhoneNumber(phoneNumber) {
    return this.db(this.tableName).where(
      'phone_number',
      'ILIKE',
      `%${phoneNumber}`
    );
  }

  getActiveByPhoneNumber(phoneNumber) {
    return this.roDb(this.tableName)
      .where('phone_number', `${phoneNumber}`)
      .andWhere('is_disabled', false)
      .first();
  }

  getAllByEmail(email) {
    return this.db(this.tableName).whereRaw(
      `lower(email) = '${email.toLowerCase()}' `
    );
  }

  async save(customer) {
    return this.db(this.tableName).insert({
      id: customer.id,
      phone_number: customer.phoneNumber,
      email: customer.email,
      password: customer.password,
      created: customer.created,
      updated: customer.updated,
      is_disabled: false,
    });
  }

  update(customer) {
    return super.save({
      id: customer.id,
      phoneNumber: customer.phoneNumber,
      email: customer.email,
      password: customer.password,
    });
  }
}

module.exports = AuthCustomer;
