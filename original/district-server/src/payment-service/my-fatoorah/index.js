const myFatoorah = require('../../lib/my-fatoorah');
const { cofePaymentErrors } = require('../error-model');
const { findErrorCode } = require('./error-code-matrix');

class MyFatoorah {
  constructor(context) {
    this.context = context;
  }

  async getPaymentMethods({ countryCode, currencyCode, platform }) {
    const paymentMethods = [];
    const rawPaymentMethods = await myFatoorah.initiatePayment(
      this.context.db,
      {
        amount: 1,
        currencyCode,
        countryCode,
        platform,
      },
      this.context
    );

    if (rawPaymentMethods.length > 0) {
      rawPaymentMethods.map(paymentMethod => {
        if (paymentMethod.id === 24) {
          paymentMethod.name = 'Apple Pay';
          paymentMethod.nameAr = 'Apple Pay';
        }
        paymentMethods.push({
          ...paymentMethod,
          sourceId: `mf_${paymentMethod.id}`,
        });
        return paymentMethod;
      });
    }

    return paymentMethods;
  }

  pay(data) {
    return myFatoorah.executePayment(this.context.db, data);
  }

  getCofePaymentError(response) {
    const {
      InvoiceStatus,
      InvoiceTransactions
    } = response.Data || response;

    if (InvoiceStatus === 'Paid') return;

    if (
      Array.isArray(InvoiceTransactions)
      && InvoiceTransactions.length > 0
    ) {
      return {
        ...findErrorCode(InvoiceTransactions[0].ErrorCode),
        providerDescription: InvoiceTransactions[0].Error
      };
    }

    return cofePaymentErrors.UNSPECIFIED_ERRORS;
  }
}

module.exports = MyFatoorah;
