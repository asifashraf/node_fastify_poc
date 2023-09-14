const BaseModel = require('../../base-model');
const QueryHelper = require('../../lib/query-helper');
const { savePaymentGatewayChargeError } = require('../root/enums');

class PaymentGatewayCharge extends BaseModel {
  constructor(db, context) {
    super(db, 'payment_gateway_charges', context);
  }

  async validate({ id, countryId, paymentGateway, paymentMethod }) {
    const errors = [];

    if (!countryId) {
      errors.push(savePaymentGatewayChargeError.MISSING_COUNTRY_ID);
    }

    const existing = await this.findWithPaymentGatewayAndMethod(
      paymentGateway,
      paymentMethod
    );

    if (id) {
      if (existing && id !== existing.id) {
        errors.push(savePaymentGatewayChargeError.ALREADY_EXISTS);
      }
    } else if (existing) {
      errors.push(savePaymentGatewayChargeError.ALREADY_EXISTS);
    }

    return errors;
  }

  findWithPaymentGatewayAndMethod(paymentGateway, paymentMethod) {
    return this.db(this.tableName)
      .where('payment_gateway', paymentGateway)
      .where('payment_method', paymentMethod)
      .first();
  }

  async searchWithName(searchTerm, countryId, paging) {
    const query = this.roDb(this.tableName).select(`${this.tableName}.*`);

    query.andWhere('country_id', countryId);

    if (searchTerm) {
      query.andWhere(query => {
        query.orWhere('payment_method', 'ILIKE', `%${searchTerm}%`);
        query.orWhere('payment_gateway', 'ILIKE', `%${searchTerm}%`);
        query.orWhere('charge_type', 'ILIKE', `%${searchTerm}%`);
      });
    }

    const rsp = await new QueryHelper(query)
      .addPaging(paging)
      .addCounting()
      .resolvePagedQuery();
    return rsp;
  }

  async getAllByCountryId(countryId) {
    const query = this.db(this.tableName).where('country_id', countryId);
    return this.context.sqlCache(query);
  }

  async getAllByCountryCode(countryCode) {
    const query = this.db(this.tableName)
      .join('countries', `${this.tableName}.country_id`, 'countries.id')
      .where('iso_code', countryCode);
    return this.context.sqlCache(query);
  }
}

module.exports = PaymentGatewayCharge;
