const { subErrorType, cofePaymentErrors } = require('../error-model');

const checkoutErrorCodeMatrix = {
  A: {
    ...cofePaymentErrors[subErrorType.CARD_3DS_ISSUE],
    providerCode: '3DS-A',
    providerDescription:
      'Authentication was attempted but could not be completed',
  },
  N: {
    ...cofePaymentErrors[subErrorType.CARD_3DS_ISSUE],
    providerCode: '3DS-N',
    providerDescription: 'Authentication failed',
  },
  U: {
    ...cofePaymentErrors[subErrorType.CARD_3DS_ISSUE],
    providerCode: '3DS-U',
    providerDescription: 'Authentication could not be completed ' +
      'owing to technical or other problems',
  },
  20005: {
    ...cofePaymentErrors.DECLINED,
    providerCode: 20005,
  },
  20051: {
    ...cofePaymentErrors.INSUFFICIENT_FUNDS,
    providerCode: 20051
  }
};

const findErrorCode = providerCode => {
  return checkoutErrorCodeMatrix[providerCode] || {
    ...cofePaymentErrors.UNSPECIFIED_ERRORS,
    providerCode
  };
};

module.exports = {
  findErrorCode
};
