const {
  paymentMethodSourceType,
  // orderPaymentMethods,
} = require('../../schema/root/enums');
const myFatoorah = require('../../lib/my-fatoorah');

function makeMfService(context) {
  return {
    async getPaymentMethods({ countryCode, currencyCode, amount }) {
      const paymentMethods = [];
      const rawPaymentMethods = await myFatoorah.initiatePayment(context.db, {
        amount,
        currencyCode,
        countryCode,
      });
      if (rawPaymentMethods.length > 0) {
        rawPaymentMethods.map(paymentMethod => {
          // let id = orderPaymentMethods.CARD;
          // switch (paymentMethod.identifier) {
          //   case 'KNET': {
          //     id = orderPaymentMethods.KNET;
          //     break;
          //   }
          //   default:
          //     break;
          // }
          paymentMethods.push({
            ...paymentMethod,
            // id,
            source: {
              type: paymentMethodSourceType.TOKEN,
              id: `mf_${paymentMethod.id}`,
            },
          });
          return paymentMethod;
        });
      }

      return paymentMethods;
    },
    pay(data) {
      return myFatoorah.executePayment(context.db, data);
    },
  };
}

module.exports = makeMfService;
