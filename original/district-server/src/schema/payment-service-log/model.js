const BaseModel = require('../../base-model');
const { uuid } = require('../../lib/util');

class PaymentServiceLog extends BaseModel {
  constructor(db, context) {
    super(db, 'payment_service_logs', context);
  }
  validatePaymentEvent(paymentEventLog) {
    if (!paymentEventLog) {
      throw new Error('Payment Event Log cannot be null or undefined');
    }
    if (!paymentEventLog.paymentService) {
      throw new Error(
        'Payment Event Log - Service cannot be undefined/null , eg. MY_FATOORAH,CHECKOUT...'
      );
    }
    if (!paymentEventLog.request) {
      throw new Error('Payment Event Log - Request cannot be undefined/null');
    }
    if (!paymentEventLog.requestType) {
      throw new Error(
        'Payment Event Log - Request Type cannot be undefined/null'
      );
    }
    if (!paymentEventLog.response) {
      throw new Error('Payment Event Log - Response cannot be undefined/null');
    }
  }
  async savePaymentLog(paymentEventLog) {
    // this method only validates event structure and saves the log to db
    try {
      this.validatePaymentEvent(paymentEventLog);
      // save method double escapes the json objects, direct insertion avoids that
      await this.db(this.tableName).insert({
        id: uuid.get(),
        ...paymentEventLog,
      });
    } catch (err) {
      console.log('Error on Save Payment Log : ', err);
    }
  }

  getLogsByOrderId(orderId) {
    return this.getAll().where('reference_order_id', orderId);
  }
}

module.exports = PaymentServiceLog;
