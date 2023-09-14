const { paymentSchemes } = require('../../payment-service/enums');

const convertLegacyPaymentMethod = paymentMethod => {
  const pm = {
    paymentScheme: paymentSchemes.LEGACY,
    name: { en: paymentSchemes.LEGACY, ar: paymentSchemes.LEGACY },
    imageUrl:
      'https://cofe-app-uploads.s3-eu-west-1.amazonaws.com/payment-methods/CreditCard.png',
    subText: '',
    sourceId: '',
  };
  if (!paymentMethod || !paymentMethod.id) {
    return pm;
  }
  pm.name = paymentMethod.name;
  pm.imageUrl = paymentMethod.imageUrl;

  switch (paymentMethod.id) {
    case paymentSchemes.CASH:
      pm.paymentScheme = paymentSchemes.CASH;
      break;
    case '1':
      pm.paymentScheme = paymentSchemes.KNET;
      pm.sourceId = 'mf_1';
      break;
    case '2':
      pm.paymentScheme = paymentSchemes.CARD;
      pm.sourceId = 'mf_2';
      break;
    case '3':
      pm.paymentScheme = paymentSchemes.AMEX;
      pm.sourceId = 'mf_3';
      break;
    case '6':
      pm.paymentScheme = paymentSchemes.MADA;
      pm.sourceId = 'mf_6';
      break;
    case '12':
      pm.paymentScheme = paymentSchemes.STC_PAY;
      pm.sourceId = 'mf_12';
      break;
    case 'CARD':
      if (
        paymentMethod.source &&
        paymentMethod.source.type === 'SAVED_CUSTOMER_CARD_TOKEN'
      ) {
        pm.paymentScheme = paymentSchemes.SAVED_CARD;
        pm.sourceId = paymentMethod.source.id;
      }
      break;
    default:
      break;
  }

  return pm;
};

module.exports = {
  convertLegacyPaymentMethod,
};
