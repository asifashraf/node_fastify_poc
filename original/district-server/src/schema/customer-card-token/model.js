const { first } = require('lodash');
const cardBINs = require('./card-bins');
const { transformToCamelCase } = require('../../lib/util');
const { customerCardTokenStatus, orderPaymentMethods } = require('../root/enums');
const BaseModel = require('../../base-model');
const { env } = require('../../../config');
const { customerCardTokenSaveError } = require('../root/enums');
const { paymentSchemes, paymentProviders } = require('../../payment-service/enums');
const moment = require('moment');

class CustomerCardToken extends BaseModel {
  constructor(db, context) {
    super(db, 'customer_card_tokens', context);
  }

  getBySourceToken(sourceToken) {
    return this.db(this.tableName)
      .where('source_token', sourceToken)
      .then(transformToCamelCase)
      .then(first);
  }

  getAllActive() {
    return super.getAll().where('status', customerCardTokenStatus.ACTIVE);
  }

  getAllByCustomer(customerId) {
    return this.getAllActive().where('customer_id', customerId);
  }

  getAllByCustomerAndProvider(customerId, paymentProvider) {
    return this.getAllActive()
      .where('customer_id', customerId)
      .andWhere('payment_provider', paymentProvider);
  }

  async setDefault(id, customerId, isDefault) {
    if (isDefault) {
      // make all tokens isDefault=false only if we want to mark another card token as default
      await this.db(this.tableName)
        .where('customer_id', customerId)
        .update('is_default', false);
    }
    return this.db(this.tableName)
      .where('id', id)
      .andWhere('customer_id', customerId)
      .update('is_default', isDefault);
  }

  async softDelete(id, customerId) {
    return this.db(this.tableName)
      .where('id', id)
      .andWhere('customer_id', customerId)
      .update('status', customerCardTokenStatus.INACTIVE);
  }

  async validate(input) {
    const errors = [];
    const cardToken = await this.getBySourceToken(input.sourceToken);
    if (cardToken && cardToken.id !== input.id) {
      errors.push(customerCardTokenSaveError.DUPLICATE_TOKEN);
    }
    const customer = await this.context.customer.getById(input.customerId);
    if (!customer) {
      errors.push(customerCardTokenSaveError.INVALID_CUSTOMER);
    }
    return errors;
  }

  getCardTypeByBIN(cardBIN) {
    return cardBINs[env].find(({bin}) => bin === cardBIN)?.card;
  }

  isCVVRequired(cardToken) {
    const cardType = this.getCardTypeByBIN(cardToken.bin);
    return cardToken.paymentProvider === paymentProviders.CHECKOUT
      && cardType === paymentSchemes.MADA;
  }

  is3DSRequired(cardToken) {
    if (!cardToken) return false;
    const cardType = this.getCardTypeByBIN(cardToken.bin);
    return cardType === paymentSchemes.MADA;
  }

  isUsableForAutoRenewal(cardToken) {
    const expiryDate = moment(
      [cardToken.expiryYear, cardToken.expiryMonth, 1]
    ).endOf('month');
    const dayLeft = expiryDate.diff(moment(), 'days');

    if (dayLeft <= 30) {
      return false;
    }

    if (cardToken.paymentProvider !== paymentProviders.CHECKOUT) {
      return false;
    }

    return !this.isCVVRequired(cardToken);
  }

  async getAllAsPaymentMethod(customerId, paymentProvider) {
    const customerCardTokens = await this.getAllActive()
      .where('customer_id', customerId)
      .andWhere('payment_provider', paymentProvider);
    return customerCardTokens.map(customerCardToken => {
      const expMonth = customerCardToken.expiryMonth
        .toString()
        .padStart(2, '0');
      let expYear = customerCardToken.expiryYear.toString();
      expYear = expYear.substring(expYear.length - 2, expYear.length);

      const isCVVRequired = this.isCVVRequired(customerCardToken);

      const isUsableForAutoRenewal = this.isUsableForAutoRenewal(
        customerCardToken
      );

      return {
        id: orderPaymentMethods.CARD,
        name: customerCardToken.scheme,
        customerCardToken,
        identifier: paymentSchemes.SAVED_CARD,
        isCVVRequired,
        isUsableForAutoRenewal,
        sourceId: customerCardToken.id,
        subText: `**** ${customerCardToken.last4} | Expiry: ${expMonth}/${expYear}`,
      };
    });
  }
}

module.exports = CustomerCardToken;
