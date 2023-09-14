const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');
const { transactionCreateError } = require('../root/enums');
const { defaultMaxLimit } = require('../../../config');
const { addPaging } = require('../../lib/util');

class Transaction extends BaseModel {
  constructor(db, context) {
    super(db, 'transactions', context);
    this.loaders = createLoaders(this);
  }

  getByCustomer(customerId, paging) {
    const query = this.db(this.tableName)
      .where('customer_id', customerId)
      .orderBy('created', 'desc');
    return addPaging(query, paging, defaultMaxLimit);
  }

  getByOrderSet(id) {
    return this.db(this.tableName)
      .where('order_set_id', id)
      .orderBy('created', 'desc');
  }

  async validate(transactionInput) {
    const errors = [];

    const customer = await this.context.customer.getById(
      transactionInput.customerId
    );

    const orderSet = await this.context.orderSet.getById(
      transactionInput.orderSetId
    );

    if (!customer) {
      errors.push(transactionCreateError.INVALID_CUSTOMER);
    }

    if (!orderSet) {
      errors.push(transactionCreateError.INVALID_ORDER);
    }

    return errors;
  }

  async add(transactionModel = {}) {
    if (!transactionModel.referenceOrderId)
      return { error: transactionCreateError.INVALID_ORDER };
    if (!transactionModel.orderType)
      return { error: transactionCreateError.INVALID_ORDER };
    if (!transactionModel.action)
      return { error: transactionCreateError.INVALID_ACTION };
    if (!transactionModel.type)
      return { error: transactionCreateError.INVALID_TYPE };
    if (!transactionModel.customerId)
      return { error: transactionCreateError.INVALID_CUSTOMER };
    if (!transactionModel.currencyId)
      return { error: transactionCreateError.INVALID_CURRENCY };

    return this.save(transactionModel);
  }
}

module.exports = Transaction;
