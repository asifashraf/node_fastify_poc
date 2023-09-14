const { cofePaymentErrors } = require('../error-model');

const mobilExpressErrorCodeMatrix = {
  LD30: {
    ...cofePaymentErrors.CARD_3DS_ISSUE,
    providerCode: 'LD30'
  },
  LD31: {
    ...cofePaymentErrors.CARD_3DS_ISSUE,
    providerCode: 'LD31'
  },
  Refused: {
    ...cofePaymentErrors.DECLINED,
    providerCode: 'Refused'
  },
  Cancelled: {
    ...cofePaymentErrors.CANCELED,
    providerCode: 'Cancelled'
  },
  UserAuthError: {
    ...cofePaymentErrors.CARD_3DS_ISSUE,
    providerCode: 'UserAuthError'
  },
  UnexpectedState: {
    ...cofePaymentErrors.DECLINED,
    providerCode: 'UnexpectedState'
  },
};

const findErrorCode = providerCode => {
  return mobilExpressErrorCodeMatrix[providerCode] || {
    ...cofePaymentErrors.UNSPECIFIED_ERRORS,
    providerCode
  };
};

module.exports = {
  findErrorCode
};
