const BaseModel = require('../../base-model');

class TapCustomer extends BaseModel {
  constructor(db, context) {
    super(db, 'tap_customers', context);
  }

  get(fields) {
    return this.db(this.tableName).where(fields).first();
  }

  async saveIfNotExist(customerId, countryCode, customerToken) {
    const tapCustomer = await this.get({
      customerId,
      countryCode,
      customerToken,
    });
    if (!tapCustomer) {
      await this.db(this.tableName).insert({
        customerId,
        countryCode,
        customerToken,
      });
    }
  }
}

module.exports = TapCustomer;
